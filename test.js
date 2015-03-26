var cHiveMaster = require("./cHiveMaster.js"),
    cHiveWorker = require("./cHiveWorker.js");

function startMaster(fCallback) {
  var oHiveMaster = new cHiveMaster();
  // hook all events and output them
  oHiveMaster.on("error", function (oError) {
    console.log("HiveMaster:error (oError =", oError, ")");
  });
  oHiveMaster.on("start", function () {
    console.log("HiveMaster:start");
    fCallback(oHiveMaster);
  });
  oHiveMaster.on("connect", function (oHiveMasterConnectionToWorker) {
    // hook all events and output them
    console.log("HiveMaster:connect (oHiveMasterConnectionToWorker =", oHiveMasterConnectionToWorker.oConnection.sId, ")");
    oHiveMasterConnectionToWorker.on("error", function (oError) {
      console.log("oHiveMasterConnectionToWorker:error (oError =", oError, ")");
    });
    oHiveMasterConnectionToWorker.on("request", function (oMessage) {
      console.log("oHiveMasterConnectionToWorker:request (oMessage =", JSON.stringify(oMessage) + ")");
    });
    oHiveMasterConnectionToWorker.on("response", function (oError, oMessage) {
      console.log("oHiveMasterConnectionToWorker:response (oError =", oError, ", oMessage =", JSON.stringify(oMessage) + ")");
    });
    oHiveMasterConnectionToWorker.on("disconnect", function () {
      console.log("oHiveMasterConnectionToWorker:disconnect");
    });
    // request list of activities for worker
    oHiveMasterConnectionToWorker.fGetListOfActivities(function (oError, asActivities) {
      if (oError) {
        console.log("oHiveMasterConnectionToWorker:cannot get list of activities:", oError);
      } else {
        console.log("oHiveMasterConnectionToWorker:list of activities:", JSON.stringify(asActivities));
        asActivities.sort();
        (function fRequestActivities_Helper() {
          var sActivity = asActivities.shift();
          var oData = {"sActivity": sActivity};
          oHiveMasterConnectionToWorker.fRequestActivity(sActivity, oData, function (oError, xResult) {
            if (oError) {
              console.log("oHiveMasterConnectionToWorker:activity", JSON.stringify(sActivity), "failed:", oError);
            } else {
              console.log("oHiveMasterConnectionToWorker:activity", JSON.stringify(sActivity), "returned", JSON.stringify(xResult));
            }
            if (asActivities.length) {
              fRequestActivities_Helper();
            } else {
              oHiveMaster.fStop();
            }
          })
        })();
      }
    });
  });
  oHiveMaster.on("disconnect", function (oHiveMasterConnectionToWorker) {
    console.log("HiveMaster:disconnect (oHiveMasterConnectionToWorker =", oHiveMasterConnectionToWorker.oConnection.sId, ")");
  });
  oHiveMaster.on("stop", function () {
    console.log("HiveMaster:stop");
  });
};

function startWorker(dfActivities, fCallback) {
  var oHiveWorker = new cHiveWorker({}, dfActivities);
  oHiveWorker.on("error", function (oError) {
    console.log("HiveWorker:error (oError =", oError, ")");
  });
  oHiveWorker.on("start", function () {
    console.log("HiveWorker:start");
    fCallback(oHiveWorker);
  });
  oHiveWorker.on("message", function (oSender, oError, xMessage) {
    console.log("HiveWorker:message (oSender = ", oSender, ", oError =", oError, ", xMessage =", JSON.stringify(xMessage) + ")");
  });
  oHiveWorker.on("connect", function (oHiveWorkerConnectionToMaster) {
    console.log("HiveWorker:connect (oHiveWorkerConnectionToMaster =", oHiveWorkerConnectionToMaster.oConnection.sId, ")");
    oHiveWorkerConnectionToMaster.on("error", function (oError) {
      console.log("oHiveWorkerConnectionToMaster:error (oError =", oError, ")");
    });
    oHiveWorkerConnectionToMaster.on("request", function (oError, oMessage) {
      console.log("oHiveWorkerConnectionToMaster:request (oError =", oError, ", oMessage =", JSON.stringify(oMessage) + ")");
    });
    oHiveWorkerConnectionToMaster.on("response", function (oMessage) {
      console.log("oHiveWorkerConnectionToMaster:response (oMessage =", JSON.stringify(oMessage) + ")");
    });
    oHiveWorkerConnectionToMaster.on("disconnect", function () {
      console.log("oHiveWorkerConnectionToMaster:disconnect");
    });
  });
  oHiveWorker.on("disconnect", function (oHiveWorkerConnectionToMaster) {
    console.log("HiveWorker:disconnect (oHiveWorkerConnectionToMaster =", oHiveWorkerConnectionToMaster.oConnection.sId, ")");
  });
  oHiveWorker.on("stop", function () {
    console.log("HiveWorker:stop");
  });
};

var dfActivities = {
  "1 send greeting": function (oHiveWorkerConnectionToMaster, xData) {
    console.log("Executing activity \"send greeting\"");
    return {
      "sGreeting": "Hello, world!",
      "xData": xData,
    };
  },
  "2 stop": function (oHiveWorkerConnectionToMaster, xData) {
    console.log("Executing activity \"stop\"");
    oHiveWorkerConnectionToMaster.oHiveWorker.fStop();
  }
};

startWorker(dfActivities, function(oHiveWorker) {
  startMaster(function(oHiveMaster) {
  });
});
