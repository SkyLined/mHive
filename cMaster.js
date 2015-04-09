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
  });
};
mUtil.inherits(cMaster, mEvents.EventEmitter);

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
    oThis.emit("request connection");
    oThis._oUDPJSONSender.fSendMessage({
      "sType": "Hive master: request connection",
      "uPort": oThis._uPort,
      "uIPVersion": oThis._uIPVersion,
    });
    if (oThis._uBroadcastInterval !== undefined) {
      oThis._oBroadcastTimeout = setTimeout(function () {
        cMaster_fSendConnectionRequests(oThis);
      }, oThis._uBroadcastInterval);
    }
  };
};
