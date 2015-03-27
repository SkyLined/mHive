module.exports = cWorker;

var mDGram = require("dgram"),
    mEvents = require("events"),
    mNet = require("net"),
    mUtil = require("util"),
    mUDPJSON = require("mUDPJSON"),
    mTCPJSON = require("mTCPJSON"),
    cWorkerConnectionToMaster = require("./cWorkerConnectionToMaster");

function cWorker(dxOptions, dfActivities) {
  if (this.constructor != arguments.callee) return new arguments.callee(dxOptions, dfActivities);
  // options: uIPVersion, uPort
  // emits: error, start, message, connect, disconnect, stop
  var oThis = this;
  dxOptions = dxOptions || {};
  oThis._uIPVersion = dxOptions.uIPVersion || 4;
  oThis._uPort = dxOptions.uPort || 28876;
  oThis.dfActivities = dfActivities || {};
  oThis._aoConnectionsToMasters = [];
  oThis._oUDPJSONReceiver = mUDPJSON.cReceiver({
    "uIPVersion": oThis._uIPVersion || 4,
    "uPort": oThis._uPort || 28876,
  });
  oThis._oUDPJSONReceiver.on("start", function () {
    oThis.emit("start");
  });
  oThis._oUDPJSONReceiver.on("error", function (oError) {
    oThis.emit("error", oError); // pass-through
    oThis._oUDPJSONReceiver.fStop();
  });
  oThis._oUDPJSONReceiver.on("message", function (oSender, oError, xMessage) {
    oThis.emit("message", oSender, oError, xMessage);
    if (!oError && xMessage.sType == "Hive master: request connection") {
      if (oThis._aoConnectionsToMasters.every(function (oConnectionToMaster) {
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
  oThis._oUDPJSONReceiver.on("stop", function (oError) {
    oThis._oUDPJSONReceiver = null; // pass-through
    if (oThis._aoConnectionsToMasters.length == 0) {
      oThis.emit("stop");
    };
  });
};
mUtil.inherits(cWorker, mEvents.EventEmitter);

cWorker.prototype.fStop = function cWorker_fStop() {
  var oThis = this;
  process.nextTick(function () { // Let the caller finish what it's doing before stopping.
    oThis._oUDPJSONReceiver && oThis._oUDPJSONReceiver.fStop();
    oThis._aoConnectionsToMasters.forEach(function (oConnection) {
      oConnection.fDisconnect();
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
      oThis._aoConnectionsToMasters.push(oConnectionToMaster);
      oConnectionToMaster.on("disconnect", function () {
        oThis._aoConnectionsToMasters.splice(oThis._aoConnectionsToMasters.indexOf(oConnectionToMaster), 1);
        process.nextTick(function() {
          // we don't want to emit "disconnect" and "stop" before everyone has handled the "disconnect" emitted by the
          // cWorkerConnectionToMaster instance.
          oThis.emit("disconnect", oConnectionToMaster);
          if (!oThis._oUDPJSONReceiver && oThis._aoConnectionsToMasters.length == 0) {
            oThis.emit("stop");
          };
        });
      });
      oThis.emit("connect", oConnectionToMaster);
    };
  });
};
