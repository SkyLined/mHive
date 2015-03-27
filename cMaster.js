var mDGram = require("dgram"),
    mEvents = require("events"),
    mOS = require("os"),
    mUtil = require("util"),
    mUDPJSON = require("mUDPJSON"),
    mTCPJSON = require("mTCPJSON"),
    cMasterConnectionToWorker = require("./cMasterConnectionToWorker");

module.exports = cMaster;

function cMaster(dxOptions) {
  if (this.constructor != arguments.callee) return new arguments.callee(dxOptions);
  // options: uIPVersion, sHostname, uPort, uBroadcastInterval (ms), uConnectionKeepAlive (ms)
  // emits: error, start, request connection, connect, disconnect, stop
  var oThis = this;
  dxOptions = dxOptions || {};
  oThis._uIPVersion = dxOptions.uIPVersion || 4;
  var sHostname = dxOptions.sHostname || mOS.hostname();
  oThis._uPort = dxOptions.uPort || 28876;
  oThis._uBroadcastInterval = dxOptions.uBroadcastInterval || 10000;
  var uConnectionKeepAlive = dxOptions.uConnectionKeepAlive,
      uMTU = dxOptions.uMTU;
  var bUDPStarted = false, bTCPStarted = false;
  oThis._bUDPStopped = false;
  oThis._bTCPStopped = false;
  oThis._aoConnectionsToWorkers = [];
  oThis._oBroadcastInterval = undefined;
  oThis._oUDPJSONSender = mUDPJSON.cSender({
    "uIPVersion": oThis._uIPVersion || 4,
    "uPort": oThis._uPort || 28876,
    "uMTU": uMTU,
  });
  oThis._oUDPJSONSender.on("start", function () {
    bUDPStarted = true;
    if (bTCPStarted) {
      oThis.emit("start");
      cMaster_fSendConnectionRequests(oThis);
    }
  });
  oThis._oUDPJSONSender.on("error", function (oError) {
    oThis.emit("error", oError); // pass-through
    oThis.fStop();
  });
  oThis._oUDPJSONSender.on("stop", function (oError) {
    if (oThis._oBroadcastInterval) {
      clearTimeout(oThis._oBroadcastInterval);
    }
    oThis.oUDPJSONReceiver = null;
    oThis._bUDPStopped = true;
    if (oThis._bTCPStopped && oThis._aoConnectionsToWorkers.length == 0) {
      oThis.emit("stop");
    }
  });
  oThis._oTCPJSONServer = mTCPJSON.cServer({
    "uIPVersion": oThis._uIPVersion,
    "sHostname": sHostname,
    "uPort": oThis._uPort,
    "uConnectionKeepAlive": uConnectionKeepAlive,
  });
  oThis._oTCPJSONServer.on("start", function() {
    bTCPStarted = true;
    if (bUDPStarted) {
      oThis.emit("start");
      cMaster_fSendConnectionRequests(oThis);
    }
  });
  oThis._oTCPJSONServer.on("error", function() {
    oThis.emit("error", oError); // pass-through
    oThis.fStop();
  });
  oThis._oTCPJSONServer.on("connect", function(oConnection) {
    cMaster_fHandleConnection(oThis, oConnection);
  });
  oThis._oTCPJSONServer.on("stop", function() {
    oThis._bTCPStopped = false;
    if (oThis._bUDPStopped && oThis._aoConnectionsToWorkers.length == 0) {
      oThis.emit("stop");
    }
  });
};
mUtil.inherits(cMaster, mEvents.EventEmitter);

cMaster.prototype.faoGetConnections = function cMaster_foGetConnections() {
  var oThis = this;
  return oThis._aoConnectionsToWorkers.slice();
}

cMaster.prototype.fStop = function cMaster_fStop() {
  var oThis = this;
  process.nextTick(function () { // Let the caller finish what it's doing before stopping.
    oThis._oUDPJSONSender.fStop();
    oThis._oTCPJSONServer.fStop();
    oThis._aoConnectionsToWorkers.forEach(function (oConnection) {
      oConnection.fDisconnect();
    });
  });
};

function cMaster_fSendConnectionRequests(oThis) {
  // Broadcast a connection request over UDP at intervals while the UDP JSON
  // Sender is not stopped.
  if (!oThis._bUDPStopped) {
    oThis.emit("request connection");
    oThis._oUDPJSONSender.fSendMessage({
      "sType": "Hive master: request connection",
      "uPort": oThis._uPort,
      "uIPVersion": oThis._uIPVersion,
    });
    oThis._oBroadcastInterval = setTimeout(function () {
      cMaster_fSendConnectionRequests(oThis);
    }, oThis._uBroadcastInterval);
  };
};

function cMaster_fHandleConnection(oThis, oConnection) {
  var oConnectionToWorker = new cMasterConnectionToWorker(oThis, oConnection);
  oThis._aoConnectionsToWorkers.push(oConnectionToWorker);
  oConnectionToWorker.on("disconnect", function () {
    oThis._aoConnectionsToWorkers.splice(oThis._aoConnectionsToWorkers.indexOf(oConnectionToWorker), 1);
    process.nextTick(function() {
      // we don't want to emit "disconnect" and "stop" before everyone has handled the "disconnect" emitted by the
      // cMasterConnectionToWorker instance.
      oThis.emit("disconnect", oConnectionToWorker);
      if (!oThis.oReceiver && oThis._aoConnectionsToWorkers.length == 0) {
        oThis.emit("stop");
      };
    });
  });
  oThis.emit("connect", oConnectionToWorker);
};
