module.exports = cEventPipe;

var mDomain = require("domain"),
    mEvents = require("events"),
    mUtil = require("util");

// Error objects cannot be converted to a string using JSON.stringify. To get around this, a copy of the Error
// object is created that has the same properties, but which can be converted to a string using JSON.stringify.
function JSONError(oError) {
  var oJSONError = {};
  Object.getOwnPropertyNames(oError).forEach(function (sPropertyName) {
    oJSONError[sPropertyName] = oError[sPropertyName];
  });
  return oJSONError;
};

function cEventPipe(oOwner, oConnection) {
  if (this.constructor != arguments.callee) return new arguments.callee(oOwner, oConnection);
  // events: error, event, message, response, disconnect
  var oThis = this;
  oThis.oOwner = oOwner;
  oThis._oConnection = oConnection;
  oThis._uNextLocalMessageId = 0;
  oThis._uNextRemoteMessageId = 0;
  oThis._dxMessagesWithPendingResults = {};
  oThis._dfResultHandlers = {};
  oThis._oConnection.on("error", function (oError) {
    oThis.emit("error", oError);
  });
  oThis._oConnection.on("disconnect", function () {
    oThis.emit("disconnect");
  });
  oThis._oConnection.on("message", function (oError, xMessage) {
    cEventPipe_fHandleMessage(oThis, oError, xMessage);
  });
};
mUtil.inherits(cEventPipe, mEvents.EventEmitter);

cEventPipe.prototype.toString = function cEventPipe_toString() {
  var oThis = this;
  return "cEventPipe[" + oThis._oConnection.toString() + "]";
}
cEventPipe.prototype.fReportEvent = function cEventPipe_fReportEvent(sEventName, xEventData, fCallback) {
  var oThis = this;
  var dxEventMessage = {
    "uMessageId": oThis._uNextLocalMessageId,
    "sType": "EventPipe: report event",
    "sEventName": sEventName,
    "xEventData": xEventData,
  };
  cEventPipe_fSendMessage(oThis, dxEventMessage, fCallback);
  oThis.emit("event", dxEventMessage);
};
cEventPipe.prototype.fDisconnect = function cEventPipe_fDisconnect() {
  var oThis = this;
  oThis._oConnection.fDisconnect();
  var asMissingResults = Object.keys(oThis._dxMessagesWithPendingResults).map(function (uId) {
    return "#" + uId + "(" + JSON.stringify(oThis._dxMessagesWithPendingResults[uId]) + ")";
  });
  if (asMissingResults.length) {
    throw new Error("Failed to receive result messages for the following events: " + asMissingResults.join(", "));
  }
};
function cEventPipe_fSendResponseAndDisconnect(oThis, dxResponseMessage) {
  cEventPipe_fSendResponse(oThis, dxResponseMessage, function () {
    oThis.fDisconnect();
  });
};
function cEventPipe_fSendResponse(oThis, dxResponseMessage, fCallback) {
  cEventPipe_fSendMessage(oThis, dxResponseMessage, fCallback);
  oThis.emit("response", dxResponseMessage);
};
function cEventPipe_fSendMessage(oThis, dxMessage, fCallback) {
  dxMessage["uMessageId"] = oThis._uNextLocalMessageId;
  oThis._oConnection.fSendMessage(dxMessage, function(bSuccess) {
    if (!bSuccess) {
      fCallback && fCallback(new Error("Unable to send message"));
    } else {
      if (fCallback) {
        oThis._dxMessagesWithPendingResults[oThis._uNextLocalMessageId] = dxMessage;
        oThis._dfResultHandlers[oThis._uNextLocalMessageId] = fCallback;
      }
      oThis._uNextLocalMessageId++;
    }
  });
};
function cEventPipe_fHandleMessage(oThis, oError, xMessage) {
  oThis.emit("message", oError, xMessage);
  if (oError) {
    cEventPipe_fSendResponseAndDisconnect(oThis, {
      "uResponseId": undefined,
      "sType": "EventPipe: error parsing message",
      "oError": JSONError(oError),
    });
    return;
  };
  if (xMessage.sType == "EventPipe: error parsing message") {
    console.log("Remote could not parse message:", JSON.stringify(xMessage));
    return;
  };
  if (parseInt(xMessage.uMessageId) !== oThis._uNextRemoteMessageId) {
    cEventPipe_fSendResponseAndDisconnect(oThis, {
      "uResponseId": undefined,
      "sType": "EventPipe: missing or invalid message id",
      "xMessage": xMessage,
    });
    return;
  };
  oThis._uNextRemoteMessageId++;
  switch (xMessage.sType) {
    case "EventPipe: missing or invalid message id":
    case "EventPipe: event not handled":
    case "EventPipe: unhandled error in event handler":
    case "EventPipe: response to unknown event":
    case "EventPipe: message type unknown":
      console.log("Remote reported an error: " + JSON.stringify(xMessage));
      break;
    case "EventPipe: report event":
      var fEventHandler = oThis.oOwner.dfEventHandlers[xMessage.sEventName];
      if (!fEventHandler) {
        cEventPipe_fSendResponse(oThis, {
          "uResponseId": xMessage.uMessageId, 
          "sType": "EventPipe: event not handled",
          "sEventName": xMessage.sEventName,
        });
      } else {
        cEventPipe_fCallEventHandler(oThis, fEventHandler, xMessage);
      };
      break;
    case "EventPipe: event handler result":
      var fEventResultHandler = oThis._dfResultHandlers[xMessage.uResponseId];
      if (!fEventResultHandler) {
        cEventPipe_fSendResponseAndCloseConnection(oThis, {
          "uResponseId": xMessage.uMessageId, 
          "sType": "EventPipe: response to unknown event",
        });
      } else {
        delete oThis._dxMessagesWithPendingResults[xMessage.uResponseId];
        delete oThis._dfResultHandlers[xMessage.uResponseId];
        process.nextTick(function() {
          fEventResultHandler(oThis, xMessage.oError, xMessage.xResultData);
        });
      };
      break;
    default:
      console.log("Unknown message type:", JSON.stringify(xMessage));
      cEventPipe_fSendResponse(oThis, {
        "sType": "EventPipe: message type unknown",
        "uResponseId": xMessage.uMessageId,
      });
      break;
  };
};

function cEventPipe_fCallEventHandler(oThis, fEventHandler, xMessage) {
  var bResponseSent = false,
      oDomain = mDomain.create();
  oDomain.on("error", function (oError) {
    if (!bResponseSent) {
      bResponseSent = true;
      return cEventPipe_fSendResponse(oThis, {
        "uResponseId": xMessage.uMessageId, 
        "sType": "EventPipe: unhandled error in event handler",
        "oError": JSONError(oError),
      });
    };
    throw oError;
  });
  oDomain.run(function() {
    process.nextTick(function () { // Clear the stack in case of an error
      fEventHandler(oThis, xMessage.xEventData, function (oError, xResultData) {
        if (!bResponseSent) {
          bResponseSent = true;
          var dxResponseMessage = {
            "uResponseId": xMessage.uMessageId, 
            "sType": "EventPipe: event handler result",
          };
          if (oError !== undefined) {
            dxResponseMessage["oError"] = JSONError(oError);
          } else if (xResultData !== undefined) {
            dxResponseMessage["xResultData"] = xResultData;
          };
          return cEventPipe_fSendResponse(oThis, dxResponseMessage);
        };
      });
    });
  });
};
