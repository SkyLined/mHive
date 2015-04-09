<<<<<<< HEAD
var mEvents = require("events"),
    mTCPJSONRPC = require("mTCPJSONRPC"),
    mUDPJSON = require("mUDPJSON"),
    mUtil = require("util");

module.exports = cMaster;

function cMaster(dxOptions) {
  if (this.constructor != arguments.callee) return new arguments.callee(dfProcedures, dxOptions);
  // options: uIPVersion, sHostname, uPort, uBroadcastInterval (ms), uConnectionKeepAlive (ms), dfProcedures
  // emits: error, start, connect, stop
  var oThis = this;
  dxOptions = dxOptions || {};
  oThis._uIPVersion = dxOptions.uIPVersion;
  var sHostname = dxOptions.sHostname;
  oThis._uPort = dxOptions.uPort;
  oThis._uBroadcastInterval = dxOptions.uBroadcastInterval || 10000;
  var uConnectionKeepAlive = dxOptions.uConnectionKeepAlive,
      uMTU = dxOptions.uMTU;
  oThis.dfProcedures = dxOptions.dfProcedures || {};
  var bUDPJSONSenderStarted = false, bTCPJSONRPCServerStarted = false;
  Object.defineProperty(oThis, "bStarted", {"get": function () { return bUDPJSONSenderStarted && bTCPJSONRPCServerStarted; }});
  oThis._oUDPJSONSender = mUDPJSON.cSender({
    "uIPVersion": oThis._uIPVersion,
    "uPort": oThis._uPort,
    "uMTU": uMTU,
  });
  oThis._oTCPJSONRPCServer = mTCPJSONRPC.cServer({
    "uIPVersion": oThis._uIPVersion,
    "sHostname": sHostname,
    "uPort": oThis._uPort,
    "uConnectionKeepAlive": uConnectionKeepAlive,
    "dfProcedures": oThis.dfProcedures,
  });
  var sId = "RPCHiveMaster@" + oThis._oUDPJSONSender.sId + "/" + oThis._oTCPJSONRPCServer.sId;
  Object.defineProperty(oThis, "sId", {"get": function () { return sId; }});
  Object.defineProperty(oThis, "bStopped", {"get": function () {
    return oThis._oTCPJSONRPCServer == null && oThis._oUDPJSONSender == null
  }});
  oThis._oBroadcastTimeout = null;
  oThis._oUDPJSONSender.on("start", function () {
    bUDPJSONSenderStarted = true;
    if (oThis.bStarted) {
      oThis.emit("start");
      cMaster_fSendConnectionRequests(oThis);
    };
  });
  oThis._oUDPJSONSender.on("error", function (oError) {
    oThis.emit("error", oError); // pass-through
  });
  oThis._oUDPJSONSender.on("stop", function (oError) {
    oThis._oUDPJSONSender = null;
    if (oThis._oBroadcastTimeout) {
      clearTimeout(oThis._oBroadcastTimeout);
      oThis._oBroadcastTimeout = null;
    }
    if (oThis.bStopped) oThis.emit("stop");
  });
  oThis._oTCPJSONRPCServer.on("start", function() {
    bTCPJSONRPCServerStarted = true;
    if (oThis.bStarted) {
      oThis.emit("start");
      cMaster_fSendConnectionRequests(oThis);
    };
  });
  oThis._oTCPJSONRPCServer.on("error", function() {
    oThis.emit("error", oError); // pass-through
  });
  oThis._oTCPJSONRPCServer.on("connect", function(oConnection) {
    oThis.emit("connect", oConnection);
  });
  oThis._oTCPJSONRPCServer.on("stop", function() {
    oThis._oTCPJSONRPCServer = null;
    if (oThis.bStopped) oThis.emit("stop");
=======
var mDGram = require("dgram"),
    mEvents = require("events"),
    mOS = require("os"),
    mUtil = require("util"),
    mUDPJSON = require("mUDPJSON"),
    mTCPJSON = require("mTCPJSON"),
    cEventPipe = require("./cEventPipe");

module.exports = cMaster;

function cMaster(dfEventHandlers, dxOptions) {
  if (this.constructor != arguments.callee) return new arguments.callee(dfEventHandlers, dxOptions);
  // options: uIPVersion, sHostname, uPort, uBroadcastInterval (ms), uConnectionKeepAlive (ms)
  // emits: error, start, request connection, connect, disconnect, stop
  var oThis = this;
  oThis.dfEventHandlers = dfEventHandlers || {};
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
  oThis._aoEventPipes = [];
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
    if (oThis._bTCPStopped && oThis._aoEventPipes.length == 0) {
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
    if (oThis._bUDPStopped && oThis._aoEventPipes.length == 0) {
      oThis.emit("stop");
    }
>>>>>>> origin/master
  });
};
mUtil.inherits(cMaster, mEvents.EventEmitter);

<<<<<<< HEAD
cMaster.prototype.fStop = function cMaster_fStop(bDisconnect) {
  var oThis = this;
  oThis._oUDPJSONSender && oThis._oUDPJSONSender.fStop();
  oThis._oTCPJSONRPCServer && oThis._oTCPJSONRPCServer.fStop(bDisconnect);
};
cMaster.prototype.fSendConnectionRequest = function cMaster_fSendConnectionRequest() {
  var oThis = this;
  cMaster_fSendConnectionRequests(oThis);
};
function cMaster_fSendConnectionRequests(oThis) {
  // Broadcast a connection request over UDP and set an interval to do so again
  // and again.
  if(oThis._oBroadcastTimeout) {
    clearTimeout(oThis._oBroadcastTimeout);
    oThis._oBroadcastTimeout = null;
  }
  if (oThis._oUDPJSONSender != null) {
=======
cMaster.prototype.faoGetConnections = function cMaster_foGetConnections() {
  var oThis = this;
  return oThis._aoEventPipes.slice();
}

cMaster.prototype.fStop = function cMaster_fStop() {
  var oThis = this;
  process.nextTick(function () { // Let the caller finish what it's doing before stopping.
    oThis._oUDPJSONSender.fStop();
    oThis._oTCPJSONServer.fStop();
    oThis._aoEventPipes.forEach(function (oConnection) {
      oConnection.fDisconnect();
    });
  });
};

function cMaster_fSendConnectionRequests(oThis) {
  // Broadcast a connection request over UDP at intervals while the UDP JSON
  // Sender is not stopped.
  if (!oThis._bUDPStopped) {
>>>>>>> origin/master
    oThis.emit("request connection");
    oThis._oUDPJSONSender.fSendMessage({
      "sType": "Hive master: request connection",
      "uPort": oThis._uPort,
      "uIPVersion": oThis._uIPVersion,
    });
<<<<<<< HEAD
    if (oThis._uBroadcastInterval !== undefined) {
      oThis._oBroadcastTimeout = setTimeout(function () {
        cMaster_fSendConnectionRequests(oThis);
      }, oThis._uBroadcastInterval);
    }
  };
};
=======
    oThis._oBroadcastInterval = setTimeout(function () {
      cMaster_fSendConnectionRequests(oThis);
    }, oThis._uBroadcastInterval);
  };
};

function cMaster_fHandleConnection(oThis, oConnection) {
  var oEventPipe = new cEventPipe(oThis, oConnection);
  oThis._aoEventPipes.push(oEventPipe);
  oEventPipe.on("disconnect", function () {
    oThis._aoEventPipes.splice(oThis._aoEventPipes.indexOf(oEventPipe), 1);
    process.nextTick(function() {
      // we don't want to emit "disconnect" and "stop" before everyone has handled the "disconnect" emitted by the
      // cEventPipe instance.
      oThis.emit("disconnect", oEventPipe);
      if (oThis._bTCPStopped && oThis._bUDPStopped && oThis._aoEventPipes.length == 0) {
        oThis.emit("stop");
      };
    });
  });
  oThis.emit("connect", oEventPipe);
};
>>>>>>> origin/master
