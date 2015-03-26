var mEvents = require("events"),
    mUtil = require("util");

module.exports = cHiveWorkerConnectionToMaster;

function cHiveWorkerConnectionToMaster(oHiveWorker, oConnection) {
  if (this.constructor != arguments.callee) return new arguments.callee(oHiveWorker, oConnection);
  // events: error, request, response, disconnect
  var oThis = this;
  oThis.oHiveWorker = oHiveWorker;
  oThis.oConnection = oConnection;
  oThis.oConnection.on("error", function (oError) {
    oThis.emit("error", oError);
  });
  oThis.oConnection.on("disconnect", function () {
    oThis.emit("disconnect");
  });
  oThis.oConnection.on("message", function (oError, xMessage) {
    cHiveWorkerConnectionToMaster_fHandleMessage(oThis, oError, xMessage);
  });
}
mUtil.inherits(cHiveWorkerConnectionToMaster, mEvents.EventEmitter);

cHiveWorkerConnectionToMaster.prototype.fDisconnect = function cHiveWorkerConnectionToMaster_fDisconnect() {
  var oThis = this;
  oThis.oConnection.fDisconnect();
}

function cHiveWorkerConnectionToMaster_fHandleMessage(oThis, oError, xMessage) {
  oThis.emit("request", oError, xMessage);
  var bDisconnect = false;
  if (oError) {
    var oResponse = {
      "sType": "cHiveWorker::error parsing message",
      "oError": oError
    };
    bDisconnect = true;
  } else if (xMessage.sType == "cHiveMaster::request list of activities") {
    var oResponse = {
      "sType": "cHiveWorker::request granted",
      "uRequestId": xMessage.uRequestId, 
      "xResult": Object.keys(oThis.oHiveWorker.dfActivities)
    };
  } else if (xMessage.sType == "cHiveMaster::request activity") {
    var fActivity = oThis.oHiveWorker.dfActivities[xMessage.sActivity];
    if (fActivity) {
      var oResponse = {
        "sType": "cHiveWorker::request granted",
        "uRequestId": xMessage.uRequestId,
      }
      try {
        oResponse.xResult = fActivity(oThis, xMessage.xData);
      } catch (oError) {
        oResponse.oError = oError;
      }
    } else {
      var oResponse = {
        "sType": "cHiveWorker::activity unknown",
        "uRequestId": xMessage.uRequestId,
      };
    }
  } else {
    var oResponse = {
      "sType": "cHiveWorker::request type unknown",
      "uRequestId": xMessage.uRequestId
    }; 
  }
  oThis.emit("response", oResponse);
  oThis.oConnection.fSendMessage(oResponse);
  bDisconnect && oThis.oConnection.fDisconnect();
}

module.exports = cHiveWorkerConnectionToMaster;
