var path = require("path");
var sModuleName = path.basename(__dirname);
module.exports.cHiveMaster = require("./cHiveMaster.js");
module.exports.cHiveWorker = require("./cHiveWorker.js");
