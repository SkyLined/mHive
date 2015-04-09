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