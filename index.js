var FlexHosts = require("./api");
var os = require("os");

module.exports = function (param, dir) {
  var flexHosts = new FlexHosts(param, dir);

  if (os.platform().match(/^win/i)) {
    var readLine = require("readline");
    var rl = readLine.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on("SIGINT", function() {
      process.emit("SIGINT");
    });
  }
  process.on("SIGINT", (function(wantoExit){
    return function() {
      if (wantoExit) {
        flexHosts.restore(function() {
          console.log("Bye bye!");
          process.exit(0);
        });
        return;
      }
      console.log("Press Control-C again to exit.");
      wantoExit = true;
    }
  })(false));
};

