var FlexHosts = require("./api");
var readLine = require("readline");

module.exports = function (param, dir) {
  var flexHosts = new FlexHosts(param, dir);

  var rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.on("SIGINT", function() {
    console.log("waiting...")
    process.emit("SIGINT");
  });

  process.once("SIGINT", function () {
    var task = flexHosts.restore();
    task.on("refreshed", function() {
      console.log("exit!")
      process.exit();
    });
  });
};

