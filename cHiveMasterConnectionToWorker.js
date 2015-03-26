var mEvents = require("events"),
    mUtil = require("util");

module.exports = cHiveMasterConnectionToWorker;

function cHiveMasterConnectionToWorker(oConnection) {
  if (this.constructor != arguments.callee) return new arguments.callee(oConnection);
  // events: error, request, response, disconnect
  var oThis = this;
  oThis.uRequestCounter = 0;
  oThis.dfCallback_by_uRequestId = {};
  oThis.oConnection = oConnection;
  oThis.oConnection.on("error", function (oError) {
    oThis.emit("error", oError);
  });
  oThis.oConnection.on("disconnect", function () {
    for (var uRequestId in oThis.dfCallback_by_uRequestId) {
      oThis.dfCallback_by_uRequestId[uRequestId](new Error("Connection disconnected"));
    }
    oThis.emit("disconnect");
  });
  oThis.oConnection.on("message", function (oError, xMessage) {
    cHiveMasterConnectionToWorker_fHandleMessage(oThis, oError, xMessage);
  });
}
mUtil.inherits(cHiveMasterConnectionToWorker, mEvents.EventEmitter);

function cHiveMasterConnectionToWorker_fSendMessage(oThis, oMessage, fCallback) {
  oMessage.uRequestId = oThis.uRequestCounter++;
  oThis.dfCallback_by_uRequestId[oMessage.uRequestId] = fCallback;
  oThis.oConnection.fSendMessage(oMessage);
  oThis.emit("request", oMessage);
};
cHiveMasterConnectionToWorker.prototype.fGetListOfActivities = function cHiveMasterConnectionToWorker_fasGetListOfActivities(fCallback) {
  var oThis = this;
  cHiveMasterConnectionToWorker_fSendMessage(oThis, {
    "sType": "cHiveMaster::request list of activities",
  }, fCallback);
};
cHiveMasterConnectionToWorker.prototype.fRequestActivity = function cHiveMasterConnectionToWorker_fRequestActivity(sActivity, xData, fCallback) {
  var oThis = this;
  cHiveMasterConnectionToWorker_fSendMessage(oThis, {
    "sType": "cHiveMaster::request activity",
    "sActivity": sActivity,
    "xData": xData
  }, fCallback);
};

cHiveMasterConnectionToWorker.prototype.fDisconnect = function cHiveMasterConnectionToWorker_fDisconnect() {
  var oThis = this;
  oThis.oConnection.fDisconnect();
}

function cHiveMasterConnectionToWorker_fHandleMessage(oThis, oError, xMessage) {
  oThis.emit("response", oError, xMessage);
  if (oError) {
    var oResponse = {
      "sType": "cHiveMaster::error parsing message",
      "oError": oError
    };
    var sResponse = JSON.stringify(oResponse);
    oClient.fSend(sResponse);
    oThis.oConnection.fDisconnect();
  } else {
    var fCallback = oThis.dfCallback_by_uRequestId[xMessage.uRequestId];
    if (xMessage.sType == "cHiveWorker::request granted") {
      if (fCallback) fCallback(xMessage.oError, xMessage.xResult);
    } else if (xMessage.sType == "cHiveWorker::activity unknown") {
      if (fCallback) fCallback(new Error("Activity unknown"));
    } else if (xMessage.sType == "cHiveWorker::request type unknown") {
      if (fCallback) fCallback(new Error("Internal error"));
      oThis.emit("error", new Error("HiveWorker did not understand my request"));
    } else {
      if (fCallback) fCallback(new Error("Internal error"));
      oThis.emit("error", new Error("HiveWorker response makes no sense"));
    }
    if (fCallback) delete oThis.dfCallback_by_uRequestId[xMessage.uRequestId]
  }
}

module.exports = cHiveMasterConnectionToWorker;