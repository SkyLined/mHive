module.exports = cMasterConnectionToWorker;

var mEvents = require("events"),
    mUtil = require("util");

function cMasterConnectionToWorker(oMaster, oConnection) {
  if (this.constructor != arguments.callee) return new arguments.callee(oConnection);
  // events: error, request, response, disconnect
  var oThis = this;
  oThis.oMaster = oMaster;
  oThis.oConnection = oConnection;
  oThis.uRequestCounter = 0;
  oThis.dfCallback_by_uRequestId = {};
  oThis.oConnection.on("error", function (oError) {
    oThis.emit("error", oError);
  });
  oThis.oConnection.on("disconnect", function () {
    for (var uRequestId in oThis.dfCallback_by_uRequestId) {
      oThis.dfCallback_by_uRequestId[uRequestId](new Error("Connection disconnected"));
    };
    oThis.emit("disconnect");
  });
  oThis.oConnection.on("message", function (oError, xMessage) {
    cMasterConnectionToWorker_fHandleMessage(oThis, oError, xMessage);
  });
};
mUtil.inherits(cMasterConnectionToWorker, mEvents.EventEmitter);

function cMasterConnectionToWorker_fSendMessage(oThis, oMessage, fCallback) {
  oMessage.uRequestId = oThis.uRequestCounter++;
  oThis.dfCallback_by_uRequestId[oMessage.uRequestId] = fCallback;
  oThis.oConnection.fSendMessage(oMessage);
  oThis.emit("request", oMessage);
};
cMasterConnectionToWorker.prototype.fGetListOfActivities = function cMasterConnectionToWorker_fasGetListOfActivities(fCallback) {
  var oThis = this;
  cMasterConnectionToWorker_fSendMessage(oThis, {
    "sType": "Hive master: request list of activities",
  }, fCallback);
};
cMasterConnectionToWorker.prototype.fRequestActivity = function cMasterConnectionToWorker_fRequestActivity(sActivity, xData, fCallback) {
  var oThis = this;
  if (fCallback === undefined && xData instanceof Function) {
    fCallback = xData; xData = undefined;
  };
  cMasterConnectionToWorker_fSendMessage(oThis, {
    "sType": "Hive master: request activity",
    "sActivity": sActivity,
    "xData": xData,
  }, fCallback);
};

cMasterConnectionToWorker.prototype.fDisconnect = function cMasterConnectionToWorker_fDisconnect() {
  var oThis = this;
  oThis.oConnection.fDisconnect();
};

function cMasterConnectionToWorker_fHandleMessage(oThis, oError, xMessage) {
  oThis.emit("response", oError, xMessage);
  if (oError) {
    var oResponse = {
      "sType": "Hive master: error parsing message",
      "oError": oError,
    };
    var sResponse = JSON.stringify(oResponse);
    oClient.fSend(sResponse);
    oThis.oConnection.fDisconnect();
  } else {
    var fCallback = oThis.dfCallback_by_uRequestId[xMessage.uRequestId];
    if (xMessage.sType == "Hive worker: request granted") {
      if (fCallback) fCallback(xMessage.oError, xMessage.xResult);
    } else if (xMessage.sType == "Hive worker: activity unknown") {
      if (fCallback) fCallback(new Error("Activity unknown"));
    } else if (xMessage.sType == "Hive worker: request type unknown") {
      if (fCallback) fCallback(new Error("Internal error"));
      oThis.emit("error", new Error("Hive worker did not understand my request"));
    } else {
      if (fCallback) fCallback(new Error("Internal error"));
      oThis.emit("error", new Error("Hive worker response makes no sense (" + xMessage.sType + ")"));
    };
    if (fCallback) delete oThis.dfCallback_by_uRequestId[xMessage.uRequestId];
  };
};
