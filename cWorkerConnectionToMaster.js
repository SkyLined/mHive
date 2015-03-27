module.exports = cWorkerConnectionToMaster;

var mEvents = require("events"),
    mUtil = require("util");

function cWorkerConnectionToMaster(oWorker, oConnection) {
  if (this.constructor != arguments.callee) return new arguments.callee(oWorker, oConnection);
  // events: error, request, response, disconnect
  var oThis = this;
  oThis.oWorker = oWorker;
  oThis._oConnection = oConnection;
  oThis._oConnection.on("error", function (oError) {
    oThis.emit("error", oError);
  });
  oThis._oConnection.on("disconnect", function () {
    oThis.emit("disconnect");
  });
  oThis._oConnection.on("message", function (oError, xMessage) {
    cWorkerConnectionToMaster_fHandleMessage(oThis, oError, xMessage);
  });
};
mUtil.inherits(cWorkerConnectionToMaster, mEvents.EventEmitter);

cWorkerConnectionToMaster.prototype.toString = function cWorkerConnectionToMaster_toString() {
  var oThis = this;
  return "cWorkerConnectionToMaster[" + oThis._oConnection.toString() + "]";
}
cWorkerConnectionToMaster.prototype.fDisconnect = function cWorkerConnectionToMaster_fDisconnect() {
  var oThis = this;
  oThis._oConnection.fDisconnect();
};

function cWorkerConnectionToMaster_fHandleMessage(oThis, oError, xMessage) {
  oThis.emit("request", oError, xMessage);
  var bDisconnect = false;
  if (oError) {
    var oResponse = {
      "sType": "Hive worker: error parsing message",
      "oError": oError,
    };
    bDisconnect = true;
  } else if (xMessage.sType == "Hive master: request list of activities") {
    var oResponse = {
      "sType": "Hive worker: request granted",
      "uRequestId": xMessage.uRequestId, 
      "xResult": Object.keys(oThis.oWorker.dfActivities),
    };
  } else if (xMessage.sType == "Hive master: request activity") {
    var fActivity = oThis.oWorker.dfActivities[xMessage.sActivity];
    if (fActivity) {
      var oResponse = {
        "sType": "Hive worker: request granted",
        "uRequestId": xMessage.uRequestId,
      };
      try {
        oResponse.xResult = fActivity(oThis, xMessage.xData);
      } catch (oError) {
        // Error objects cannot be converted to a string using JSON.stringify. To get around this, a copy of the Error
        // object is created that has the same properties, but which can be converted to a string using JSON.stringify.
        oResponse.oError = {};
        Object.getOwnPropertyNames(oError).forEach(function (sPropertyName) {
          oResponse.oError[sPropertyName] = oError[sPropertyName];
        });
      };
    } else {
      var oResponse = {
        "sType": "Hive worker: activity unknown",
        "uRequestId": xMessage.uRequestId,
      };
    };
  } else {
    var oResponse = {
      "sType": "Hive worker: request type unknown",
      "uRequestId": xMessage.uRequestId,
    }; 
  };
  oThis.emit("response", oResponse);
  oThis._oConnection.fSendMessage(oResponse);
  bDisconnect && oThis._oConnection.fDisconnect();
};
