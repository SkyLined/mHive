module.exports = cWorkerConnectionToMaster;

var mEvents = require("events"),
    mUtil = require("util");

function cWorkerConnectionToMaster(oWorker, oConnection) {
  if (this.constructor != arguments.callee) return new arguments.callee(oWorker, oConnection);
  // events: error, request, response, disconnect
  var oThis = this;
  oThis.oWorker = oWorker;
  oThis.oConnection = oConnection;
  oThis.oConnection.on("error", function (oError) {
    oThis.emit("error", oError);
  });
  oThis.oConnection.on("disconnect", function () {
    oThis.emit("disconnect");
  });
  oThis.oConnection.on("message", function (oError, xMessage) {
    cWorkerConnectionToMaster_fHandleMessage(oThis, oError, xMessage);
  });
};
mUtil.inherits(cWorkerConnectionToMaster, mEvents.EventEmitter);

cWorkerConnectionToMaster.prototype.fDisconnect = function cWorkerConnectionToMaster_fDisconnect() {
  var oThis = this;
  oThis.oConnection.fDisconnect();
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
        oResponse.oError = oError;
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
  oThis.oConnection.fSendMessage(oResponse);
  bDisconnect && oThis.oConnection.fDisconnect();
};
