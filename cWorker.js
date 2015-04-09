module.exports = cWorker;

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
    oThis.emit("start");
  });
  oThis._oUDPJSONReceiver.on("error", function (oError) {
    oThis.emit("error", oError); // pass-through
    oThis._oUDPJSONReceiver.fStop();
  });
  oThis._oUDPJSONReceiver.on("message", function (oSender, oError, xMessage) {
    if (!oError && xMessage.sType == "Hive master: request connection") {
      // There may already be a connection to this master, in which case the following function does nothing:
      cWorker_fConnectToMaster(oThis, xMessage.uIPVersion, oSender.sHostname, xMessage.uPort);
    };
  });
  oThis._oUDPJSONReceiver.on("stop", function (oError) {
    oThis._oUDPJSONReceiver = null; // pass-through
    if (oThis.bStopped) oThis.emit("stop");
  });
};
mUtil.inherits(cWorker, mEvents.EventEmitter);

cWorker.prototype.fStop = function cWorker_fStop(bDisconnect) {
  var oThis = this;
  oThis._oUDPJSONReceiver && oThis._oUDPJSONReceiver.fStop();
  if (bDisconnect) Object.keys(oThis._doConnections).forEach(function (sId) {
    oThis._doConnections[sId].fDisconnect();
  });
};

function cWorker_fConnectToMaster(oThis, uIPVersion, sHostname, uPort) {
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
  });
};
