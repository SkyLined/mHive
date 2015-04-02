var cHiveMaster = require("./cMaster.js"),
    cHiveWorker = require("./cWorker.js");

function startMaster(fCallback) {
  var oHiveMaster = new cHiveMaster();
  // hook all events and output them
  oHiveMaster.on("error", function (oError) {
    console.log("HiveMaster:error (oError =", oError, ")");
  });
  oHiveMaster.on("start", function () {
    console.log("HiveMaster:start");
    fCallback && fCallback(oHiveMaster);
  });
  oHiveMaster.on("request connection", function () {
    console.log("HiveMaster:request connection");
  });
  oHiveMaster.on("connect", function (oEventPipe) {
    // hook all events and output them
    console.log("HiveMaster:connect (oEventPipe = " + oEventPipe.toString() + ")");
    oEventPipe.on("error", function (oError) {
      console.log("oEventPipe:error (oError = " + JSON.stringify(oError) + ")");
    });
    oEventPipe.on("event", function (dxEventMessage) {
      console.log("oEventPipe:event (oMessage = " + JSON.stringify(dxEventMessage) + ")");
    });
    oEventPipe.on("message", function (oError, oMessage) {
      console.log("oEventPipe:message (oError = " + JSON.stringify(oError) + ", oMessage =", JSON.stringify(oMessage) + ")");
    });
    oEventPipe.on("response", function (dxResponseMessage) {
      console.log("oEventPipe:response (oMessage =", JSON.stringify(dxResponseMessage) + ")");
    });
    oEventPipe.on("disconnect", function () {
      console.log("oEventPipe:disconnect");
      oHiveMaster.fStop();
    });
    oEventPipe.fReportEvent("request greeting", null, function(oEventPipe, oError, xResultData) {
      if (oError) throw oError;
      console.log("request greeting result:", JSON.stringify(xResultData));
      oEventPipe.fReportEvent("request stop", null, function(oEventPipe, oError, xResultData) {
        if (oError) throw oError;
        console.log("request stop result:", JSON.stringify(xResultData));
      });
    });
  });
  oHiveMaster.on("disconnect", function (oEventPipe) {
    console.log("HiveMaster:disconnect (oEventPipe = " + oEventPipe.toString() + ")");
  });
  oHiveMaster.on("stop", function () {
    console.log("HiveMaster:stop");
  });
};

function startWorker(dfEventHandlers, fCallback) {
  var oHiveWorker = new cHiveWorker(dfEventHandlers);
  oHiveWorker.on("error", function (oError) {
    console.log("HiveWorker:error (oError =", oError, ")");
  });
  oHiveWorker.on("start", function () {
    console.log("HiveWorker:start");
    fCallback && fCallback(oHiveWorker);
  });
  oHiveWorker.on("message", function (oSender, oError, xMessage) {
    console.log("HiveWorker:message (oSender = ", oSender, ", oError =", oError, ", xMessage =", JSON.stringify(xMessage) + ")");
  });
  oHiveWorker.on("connect", function (oEventPipe) {
    console.log("HiveWorker:connect (oEventPipe = " + oEventPipe.toString() + ")");
    oEventPipe.on("error", function (oError) {
      console.log("oEventPipe:error (oError =", oError, ")");
    });
    oEventPipe.on("event", function (dxEventMessage) {
      console.log("oEventPipe:event (oMessage = " + JSON.stringify(dxEventMessage) + ")");
    });
    oEventPipe.on("message", function (oError, oMessage) {
      console.log("oEventPipe:message (oError = " + JSON.stringify(oError) + ", oMessage =", JSON.stringify(oMessage) + ")");
    });
    oEventPipe.on("response", function (dxResponseMessage) {
      console.log("oEventPipe:response (oMessage =", JSON.stringify(dxResponseMessage) + ")");
    });
    oEventPipe.on("disconnect", function () {
      console.log("oEventPipe:disconnect");
    });
  });
  oHiveWorker.on("disconnect", function (oEventPipe) {
    console.log("HiveWorker:disconnect (oEventPipe = " + oEventPipe.toString() + ")");
  });
  oHiveWorker.on("stop", function () {
    console.log("HiveWorker:stop");
  });
};

var dfEventHandlers = {
  "request greeting": function (oEventPipe, xEventData, fCallback) {
    console.log("Executing activity \"send greeting\"");
    fCallback(undefined, {
      "sGreeting": "Hello, world!",
      "xData": xEventData,
    });
  },
  "request stop": function (oEventPipe, xEventData, fCallback) {
    console.log("Executing activity \"stop\"");
    oEventPipe.oOwner.fStop();
    fCallback();
  }
};

if (process.argv[2] == "worker") {
  oWorker = startWorker(dfEventHandlers);
} else if (process.argv[2] == "master") {
  startMaster();
} else {
  startWorker(dfEventHandlers, function(oHiveWorker) {
    startMaster(function(oHiveMaster) {
    });
  });
}