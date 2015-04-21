var isCLI = (process.title == "node");
if (isCLI) {
  var pkg = require(__dirname + "/package.json");
  require("check-update")({
    packageName: pkg.name,
    packageVersion: pkg.version,
    isCLI: isCLI
  }, function (err, latestVersion, defaultMessage) {
    if (!err && pkg.version < latestVersion) {
      console.log(defaultMessage);
    }
  });
}

module.exports = function (param, dir, cb) {
  var FlexHosts = require("./api");
  var readLine = require("readline");
  var pathLib = require("path");
  var fsLib = require("fs");
  var mkdirp = require("mkdirp");

  param = param || {};

  if (typeof dir == "function") {
    cb = dir;
    dir = null;
  }
  else if (typeof cb != "function") {
    cb = function (err, host2ip) {
      if (err) {
        console.log(err);
      }
      else {
        console.log(host2ip);
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

  var flexHosts = new FlexHosts(param, confFile, cb);

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

  return flexHosts;
};
