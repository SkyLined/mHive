var mDGram = require("dgram"),
    mEvents = require("events"),
    mOS = require("os"),
    mUtil = require("util"),
    mUDPJSON = require("../mUDPJSON"),
    mTCPJSON = require("../mTCPJSON"),
    cHiveMasterConnectionToWorker = require("./cHiveMasterConnectionToWorker");

module.exports = cHiveMaster;

function cHiveMaster(dxOptions) {
  if (this.constructor != arguments.callee) return new arguments.callee(dxOptions);
  // options: uIPVersion, sHostname, uPort, uBroadcastInterval (ms), uConnectionKeepAlive (ms)
  // emits: error, start, connect, disconnect, stop
  var oThis = this;
  dxOptions = dxOptions || {};
  oThis.uIPVersion = dxOptions.uIPVersion || 4;
  oThis.sHostname = dxOptions.sHostname || mOS.hostname();
  oThis.uPort = dxOptions.uPort || 28876;
  oThis.uBroadcastInterval = dxOptions.uBroadcastInterval || 10000;
  oThis.uConnectionKeepAlive = dxOptions.uConnectionKeepAlive;
  var bUDPStarted = false, bTCPStarted = false;
  oThis.bUDPStopped = false;
  oThis.bTCPStopped = false;
  oThis.aoConnectionsToWorkers = [];
  oThis.oUDPJSONSender = mUDPJSON.cSender({
    "uIPVersion": dxOptions.uIPVersion || 4,
    "uPort": dxOptions.uPort || 28876,
  });
  var uBroadcastInterval;
  oThis.oUDPJSONSender.on("start", function () {
    bUDPStarted = true;
    if (bTCPStarted) oThis.emit("start");
    cHiveMaster_fBroadcastConnectionRequests(oThis);
  });
  oThis.oUDPJSONSender.on("error", function (oError) {
    oThis.emit("error", oError); // pass-through
    oThis.fStop();
  });
  oThis.oUDPJSONSender.on("stop", function (oError) {
    if (uBroadcastInterval) clearInterval(uBroadcastInterval);
    oThis.oUDPJSONReceiver = null;
    oThis.bUDPStopped = true;
    if (oThis.bTCPStopped && oThis.aoConnectionsToWorkers.length == 0) oThis.emit("stop");
  });
  oThis.oTCPJSONServer = mTCPJSON.cServer({
    "uIPVersion": oThis.uIPVersion,
    "sHostname": oThis.sHostname,
    "uPort": oThis.uPort,
    "uConnectionKeepAlive": oThis.uConnectionKeepAlive,
  });
  oThis.oTCPJSONServer.on("start", function() {
    bTCPStarted = true;
    if (bUDPStarted) oThis.emit("start");
  });
  oThis.oTCPJSONServer.on("error", function() {
    oThis.emit("error", oError); // pass-through
    oThis.fStop();
  });
  oThis.oTCPJSONServer.on("connect", function(oConnection) {
    cHiveMaster_fHandleConnection(oThis, oConnection);
  });
  oThis.oTCPJSONServer.on("stop", function() {
    oThis.bTCPStopped = false;
    if (oThis.bUDPStopped && oThis.aoConnectionsToWorkers.length == 0) oThis.emit("stop");
  });
};
mUtil.inherits(cHiveMaster, mEvents.EventEmitter);

cHiveMaster.prototype.fStop = function cHiveMaster_fStop() {
  var oThis = this;
  process.nextTick(function () { // Let the caller finish what it's doing before stopping.
    oThis.oUDPJSONSender.fStop();
    oThis.oTCPJSONServer.fStop();
    oThis.aoConnectionsToWorkers.forEach(function (oConnection) {
      oConnection.fDisconnect();
    });
  });
};

function cHiveMaster_fBroadcastConnectionRequests(oThis) {
  // Broadcast a connection request over UDP at intervals while the UDP JSON
  // Sender is not stopped.
  if (!oThis.bUDPStopped) {
    oThis.oUDPJSONSender.fSendMessage({
      "sType": "cHiveMaster::request connection",
      "uPort": oThis.uPort,
      "uIPVersion": oThis.uIPVersion,
    });
    setTimeout(function () {
      cHiveMaster_fBroadcastConnectionRequests(oThis);
    }, oThis.uBroadcastInterval);
  }
}

function cHiveMaster_fHandleConnection(oThis, oConnection) {
  var oConnectionToWorker = new cHiveMasterConnectionToWorker(oConnection);
  oThis.aoConnectionsToWorkers.push(oConnectionToWorker);
  oConnectionToWorker.on("disconnect", function () {
    oThis.aoConnectionsToWorkers.splice(oThis.aoConnectionsToWorkers.indexOf(oConnectionToWorker), 1);
    oThis.emit("disconnect", oConnectionToWorker);
    if (!oThis.oReceiver && oThis.aoConnectionsToWorkers.length == 0) {
      oThis.emit("stop");
    }
  });
  oThis.emit("connect", oConnectionToWorker);
}
