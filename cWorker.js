module.exports = cWorker;

var mDGram = require("dgram"),
    mEvents = require("events"),
    mNet = require("net"),
    mUtil = require("util"),
    mUDPJSON = require("../mUDPJSON"),
    mTCPJSON = require("../mTCPJSON"),
    cWorkerConnectionToMaster = require("./cWorkerConnectionToMaster");

function cWorker(dxOptions, dfActivities) {
  if (this.constructor != arguments.callee) return new arguments.callee(dxOptions, dfActivities);
  // options: uIPVersion, uPort
  // emits: error, start, message, connect, disconnect, stop
  var oThis = this;
  dxOptions = dxOptions || {};
  oThis.uIPVersion = dxOptions.uIPVersion || 4;
  oThis.uPort = dxOptions.uPort || 28876;
  oThis.dfActivities = dfActivities || {};
  oThis.aoConnectionsToMasters = [];
  oThis.oUDPJSONReceiver = mUDPJSON.cReceiver({
    "uIPVersion": oThis.uIPVersion || 4,
    "uPort": oThis.uPort || 28876,
  });
  oThis.oUDPJSONReceiver.on("start", function () {
    oThis.emit("start");
  });
  oThis.oUDPJSONReceiver.on("error", function (oError) {
    oThis.emit("error", oError); // pass-through
    oThis.oUDPJSONReceiver.fStop();
  });
  oThis.oUDPJSONReceiver.on("message", function (oSender, oError, xMessage) {
    oThis.emit("message", oSender, oError, xMessage);
    if (!oError && xMessage.sType == "Hive master: request connection") {
      if (oThis.aoConnectionsToMasters.every(function (oConnectionToMaster) {
        return (
          oConnectionToMaster.oConnection.uIPVersion != xMessage.uIPVersion ||
          oConnectionToMaster.oConnection.sHostname != oSender.sHostname ||
          oConnectionToMaster.oConnection.uPort != xMessage.uPort
        );
      })) {
        cWorker_fConnectToMaster(oThis, xMessage.uIPVersion, oSender.sHostname, xMessage.uPort);
      };
    }; // Note: errors and other messages are completely ignored!
  });
  oThis.oUDPJSONReceiver.on("stop", function (oError) {
    oThis.oUDPJSONReceiver = null; // pass-through
    if (oThis.aoConnectionsToMasters.length == 0) {
      oThis.emit("stop");
    };
  });
};
mUtil.inherits(cWorker, mEvents.EventEmitter);

cWorker.prototype.fStop = function cWorker_fStop() {
  var oThis = this;
  process.nextTick(function () { // Let the caller finish what it's doing before stopping.
    oThis.oUDPJSONReceiver && oThis.oUDPJSONReceiver.fStop();
    oThis.aoConnectionsToMasters.forEach(function (oMasterConnection) {
      oMasterConnection.fDisconnect();
    });
  });
};

function cWorker_fConnectToMaster(oThis, uIPVersion, sHostname, uPort) {
  mTCPJSON.fConnect({
    "uIPVersion": uIPVersion,
    "sHostname": sHostname,
    "uPort": uPort,
    "uConnectionKeepAlive": oThis.uConnectionKeepAlive,
  }, function (oError, oConnection) {
    if (oError) {
      oThis.emit("error", oError);
    } else {
      var oConnectionToMaster = new cWorkerConnectionToMaster(oThis, oConnection);
      oThis.aoConnectionsToMasters.push(oConnectionToMaster);
      oConnectionToMaster.on("disconnect", function () {
        oThis.aoConnectionsToMasters.splice(oThis.aoConnectionsToMasters.indexOf(oConnectionToMaster), 1);
        oThis.emit("disconnect", oConnectionToMaster);
        if (!oThis.oUDPJSONReceiver && oThis.aoConnectionsToMasters.length == 0) {
          oThis.emit("stop");
        };
      });
      oThis.emit("connect", oConnectionToMaster);
    };
  });
};
