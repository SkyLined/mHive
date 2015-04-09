module.exports = cWorker;

<<<<<<< HEAD
var mEvents = require("events"),
    mTCPJSONRPC = require("mTCPJSONRPC"),
    mUDPJSON = require("mUDPJSON"),
    mUtil = require("util");

function cWorker(dxOptions) {
  if (this.constructor != arguments.callee) return new arguments.callee(dxOptions);
  // options: uIPVersion, sHostname, uPort, dfProcedures
  // emits: error, start, connect, stop
  var oThis = this;
  dxOptions = dxOptions || {};
  var uIPVersion = dxOptions.uIPVersion,
      sHostname = dxOptions.sHostname,
      uPort = dxOptions.uPort;
  oThis._uConnectionKeepAlive = dxOptions.uConnectionKeepAlive,
  oThis.dfProcedures = dxOptions.dfProcedures || {};
  var bStarted = false;
  Object.defineProperty(oThis, "bStarted", {"get": function () { return bStarted; }});
  oThis._doConnections = {};
  oThis._oUDPJSONReceiver = mUDPJSON.cReceiver({
    "uIPVersion": uIPVersion,
    "sHostname": sHostname,
    "uPort": uPort,
  });
  var sId = "RPCHiveWorker@" + oThis._oUDPJSONReceiver.sId;
  Object.defineProperty(oThis, "sId", {"get": function () { return sId; }});
  Object.defineProperty(oThis, "bStopped", {"get": function () {
    return (
      oThis._oUDPJSONReceiver == null &&
      Object.keys(oThis._doConnections).length == 0
    );
  }});
  oThis._oUDPJSONReceiver.on("start", function () {
    bStarted = true;
=======
var mDGram = require("dgram"),
    mEvents = require("events"),
    mNet = require("net"),
    mUtil = require("util"),
    mUDPJSON = require("mUDPJSON"),
    mTCPJSON = require("mTCPJSON"),
    cEventPipe = require("./cEventPipe");

function cWorker(dfEventHandlers, dxOptions) {
  if (this.constructor != arguments.callee) return new arguments.callee(dfEventHandlers, dxOptions);
  // options: uIPVersion, uPort
  // emits: error, start, message, connect, disconnect, stop
  var oThis = this;
  oThis.dfEventHandlers = dfEventHandlers || {};
  dxOptions = dxOptions || {};
  oThis._uIPVersion = dxOptions.uIPVersion || 4;
  oThis._uPort = dxOptions.uPort || 28876;
  oThis._aoEventPipes = [];
  oThis._oUDPJSONReceiver = mUDPJSON.cReceiver({
    "uIPVersion": oThis._uIPVersion || 4,
    "uPort": oThis._uPort || 28876,
  });
  oThis._oUDPJSONReceiver.on("start", function () {
>>>>>>> origin/master
    oThis.emit("start");
  });
  oThis._oUDPJSONReceiver.on("error", function (oError) {
    oThis.emit("error", oError); // pass-through
    oThis._oUDPJSONReceiver.fStop();
  });
  oThis._oUDPJSONReceiver.on("message", function (oSender, oError, xMessage) {
<<<<<<< HEAD
    if (!oError && xMessage.sType == "Hive master: request connection") {
      // There may already be a connection to this master, in which case the following function does nothing:
      cWorker_fConnectToMaster(oThis, xMessage.uIPVersion, oSender.sHostname, xMessage.uPort);
    };
  });
  oThis._oUDPJSONReceiver.on("stop", function (oError) {
    oThis._oUDPJSONReceiver = null; // pass-through
    if (oThis.bStopped) oThis.emit("stop");
=======
    oThis.emit("message", oSender, oError, xMessage);
    if (!oError && xMessage.sType == "Hive master: request connection") {
      if (oThis._aoEventPipes.every(function (oEventPipe) {
        return (
          oEventPipe.oConnection.uIPVersion != xMessage.uIPVersion ||
          oEventPipe.oConnection.sHostname != oSender.sHostname ||
          oEventPipe.oConnection.uPort != xMessage.uPort
        );
      })) {
        cWorker_fConnectToMaster(oThis, xMessage.uIPVersion, oSender.sHostname, xMessage.uPort);
      };
    }; // Note: errors and other messages are completely ignored!
  });
  oThis._oUDPJSONReceiver.on("stop", function (oError) {
    oThis._oUDPJSONReceiver = null; // pass-through
    if (oThis._aoEventPipes.length == 0) {
      oThis.emit("stop");
    };
>>>>>>> origin/master
  });
};
mUtil.inherits(cWorker, mEvents.EventEmitter);

<<<<<<< HEAD
cWorker.prototype.fStop = function cWorker_fStop(bDisconnect) {
  var oThis = this;
  oThis._oUDPJSONReceiver && oThis._oUDPJSONReceiver.fStop();
  if (bDisconnect) Object.keys(oThis._doConnections).forEach(function (sId) {
    oThis._doConnections[sId].fDisconnect();
=======
cWorker.prototype.fStop = function cWorker_fStop() {
  var oThis = this;
  process.nextTick(function () { // Let the caller finish what it's doing before stopping.
    oThis._oUDPJSONReceiver && oThis._oUDPJSONReceiver.fStop();
    oThis._aoEventPipes.forEach(function (oConnection) {
      oConnection.fDisconnect();
    });
>>>>>>> origin/master
  });
};

function cWorker_fConnectToMaster(oThis, uIPVersion, sHostname, uPort) {
<<<<<<< HEAD
  var sId = "TCP" + uIPVersion + "@" + sHostname + ":" + uPort;
  if (sId in oThis._doConnections) return; // Already connected
  mTCPJSONRPC.fConnect(function (oError, oConnection) {
    if (oError) {
      oThis.emit("error", oError);
    } else {
      oThis._doConnections[sId] = oConnection;
      oConnection.on("disconnect", function () {
        delete oThis._doConnections[sId];
        if (oThis.bStopped) oThis.emit("stop");
      });
      oThis.emit("connect", oConnection);
    };
  }, {
    "uIPVersion": uIPVersion,
    "sHostname": sHostname,
    "uPort": uPort,
    "uConnectionKeepAlive": oThis._uConnectionKeepAlive,
    "dfProcedures": oThis.dfProcedures,
=======
  mTCPJSON.fConnect({
    "uIPVersion": uIPVersion,
    "sHostname": sHostname,
    "uPort": uPort,
    "uConnectionKeepAlive": oThis.uConnectionKeepAlive,
  }, function (oError, oConnection) {
    if (oError) {
      oThis.emit("error", oError);
    } else {
      var oEventPipe = new cEventPipe(oThis, oConnection);
      oThis._aoEventPipes.push(oEventPipe);
      oEventPipe.on("disconnect", function () {
        oThis._aoEventPipes.splice(oThis._aoEventPipes.indexOf(oEventPipe), 1);
        process.nextTick(function() {
          // we don't want to emit "disconnect" and "stop" before everyone has handled the "disconnect" emitted by the
          // oEventPipe instance.
          oThis.emit("disconnect", oEventPipe);
          if (!oThis._oUDPJSONReceiver && oThis._aoEventPipes.length == 0) {
            oThis.emit("stop");
          };
        });
      });
      oThis.emit("connect", oEventPipe);
    };
>>>>>>> origin/master
  });
};
