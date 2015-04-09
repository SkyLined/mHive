<<<<<<< HEAD
var cMaster = require("./cMaster.js"),
    cWorker = require("./cWorker.js");

var bMasterReceivedCall = false,
    bMasterReceivedResult = false,
    bWorkerReceivedCall = false,
    bWorkerReceivedResult = false,
    bWorkerDisconnected = false,
    bMasterDisconnected = false,
    dfMasterProcedures = {
      "test": function (oConnection, xData, fCallback) {
        console.log("Worker->Master RPC is executing");
        bMasterReceivedCall = true;
        if (xData == "argument") {
          fCallback(undefined, "result");
        } else {
          fCallback(new Error("Invalid argument"));
        }
      },
    },
    dfWorkerProcedures = {
      "test": function (oConnection, xData, fCallback) {
        console.log("Master->Worker RPC is executing");
        bWorkerReceivedCall = true;
        if (xData == "argument") {
          fCallback(undefined, "result");
        } else {
          fCallback(new Error("Invalid argument"));
        }
      },
    },
    oMaster = new cMaster({"dfProcedures": dfMasterProcedures}),
    oWorker = new cWorker({"dfProcedures": dfWorkerProcedures});
oMaster.on("start", function () {
  console.log("Master started");
  fConnectWhenReady();
});
oWorker.on("start", function () {
  console.log("Worker started");
  fConnectWhenReady();
});
function fConnectWhenReady() {
  // The worker might start after the master, in which case it will miss the
  // first connection request broadcast. Rather than wait for the next, we can
  // make sure a connection request broadcast is made when both are started:
  if (oMaster.bStarted && oWorker.bStarted) {
    oMaster.fSendConnectionRequest();
  };
};
oMaster.on("connect", function (oConnection) {
  console.log("connection established on Master-side");
  oConnection.on("initialize", function () {
    console.log("connection initialized on Master-side");
    oConnection.fCall("test", "argument", function (oConnection, oError, xResult) {
      console.log("Master->Worker RPC received result");
      if (oError) throw oError;
      if (xResult != "result") throw new Error("Invalid result");
      bMasterReceivedResult = true;
      fDisconnectWhenDone(oConnection, "Master");
    });
    console.log("Master->Worker RPC requested");
  });
  oMaster.fStop(); // No need for any more connections.
  oConnection.on("disconnect", function () {
    bMasterDisconnected = true;
    fReportFinishedWhenDone("Master");
  });
});
oWorker.on("connect", function (oConnection) {
  console.log("connection established on Worker-side");
  oConnection.on("initialize", function () {
    console.log("connection initialized on Worker-side");
    oConnection.fCall("test", "argument", function (oConnection, oError, xResult) {
      console.log("Worker->Master RPC received result");
      if (oError) throw oError;
      if (xResult != "result") throw new Error("Invalid result");
      bWorkerReceivedResult = true;
      fDisconnectWhenDone(oConnection, "Worker");
    });
    console.log("Worker->Master RPC requested");
  });
  oConnection.on("disconnect", function () {
    bWorkerDisconnected = true;
    fReportFinishedWhenDone("Worker");
  });
  oWorker.fStop(); // No need for any more connections.
}, {"dfProcedures": dfWorkerProcedures});
oMaster.on("stop", function () {
  console.log("Master stopped");
});
oWorker.on("stop", function () {
  console.log("Worker stopped");
});

function fDisconnectWhenDone(oConnection, sSide) {
  if (bMasterReceivedCall && bMasterReceivedResult && bWorkerReceivedCall && bWorkerReceivedResult) {
    console.log("connection disconnected from " + sSide + "-side");
    oConnection.fDisconnect();
  };
};
function fReportFinishedWhenDone(sSide) {
  console.log("connection disconnected on " + sSide + "-side");
  if (bMasterReceivedCall && bMasterReceivedResult && bWorkerReceivedCall && bWorkerReceivedResult
      && bMasterDisconnected && bWorkerDisconnected) {
    console.log("test completed successfully");
  };
};
=======
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
>>>>>>> origin/master
