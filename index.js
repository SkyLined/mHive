var path = require("path");
var sModuleName = path.basename(__dirname);
module.exports.cMaster = require("./cMaster.js");
module.exports.cWorker = require("./cWorker.js");
