var FlexHosts = require("./api");
var readLine = require("readline");

try {
  var pkg = require(__dirname + "/package.json");

  require("check-update")({
    packageName: pkg.name,
    packageVersion: pkg.version,
    isCLI: process.title == "node"
  }, function (err, latestVersion, defaultMessage) {
    if (!err && pkg.version < latestVersion) {
      console.log(defaultMessage);
    }
  });
}
catch (e) {
}

module.exports = function (param, dir) {
  var flexHosts = new FlexHosts(param, dir);

  var rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.on("SIGINT", function () {
    console.log("waiting...");
    process.emit("SIGINT");
  });

  process.once("SIGINT", function () {
    flexHosts.restore();
    flexHosts.on("refreshed", function () {
      console.log("exit!");
      process.exit();
    });
  });

  return flexHosts;
};

