module.exports = function (param, dir, cb, isGroup) {
  var FlexHosts = require("./api");
  var readLine = require("readline");
  var pathLib = require("path");
  var fsLib = require("fs");
  var mkdirp = require("mkdirp");

  param = param || {};
  isGroup = isGroup || false;
  if (typeof dir == "function") {
    cb = dir;
    dir = null;
  }
  if (typeof dir == 'boolean') {
    isGroup = dir;
    cb = null;
    dir = null;
  }

  if (typeof cb != "function") {
    cb = function (err, host2ip) {
      if (err) {
        console.log(err);
      }
      else {
        console.log('callback',host2ip);
      }
    };
  }

  var confDir, confFile, json = pathLib.basename(__dirname) + ".json";
  if (dir) {
    if (dir.indexOf('/') == 0 || /^\w{1}:[\\/].*$/.test(dir)) {
      if (/\.json$/.test(dir)) {
        confFile = dir;
        confDir = pathLib.dirname(confFile);
      }
      else {
        confDir = dir;
        confFile = pathLib.join(confDir, json);
      }
    }
    else {
      confDir = pathLib.join(process.cwd(), dir);
      confFile = pathLib.join(confDir, json);
    }

    if (!fsLib.existsSync(confDir)) {
      mkdirp.sync(confDir);
      fsLib.chmod(confDir, 0777);
    }
  }
  else {
    confFile = null;
  }
  var flexHosts = new FlexHosts(param, confFile, cb, isGroup);

  var rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.on("SIGINT", function () {
    process.emit("SIGINT");
  });

  process.on("SIGINT", (function (i) {
    return function() {
      switch (i) {
        case 0:
          console.log("\n\x1b[35m%s\x1b[0m", "Press Control-C again to exit.");
          i++;
          break;
        case 1:
          console.log("Exiting...");
          flexHosts.restore();
          i++;
          break;
        default:
          console.log("Waiting...");
      }
    }
  })(0));
  process.on('uncaughtException', function (err) {
    cb && cb(err);
    flexHosts.restore();
  })
  return flexHosts;
};
