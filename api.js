var pathLib = require("path");
var fsLib = require("fs");
var Helper = require("./lib/helper");
var sys = require("./lib/system");
var exec = require("child_process").exec;

function FlexHosts(param, dir) {
  param = param || {};
  this.hosts = [];
  this.content = '';

  this.beginTag = "##### " + process.cwd() + " Begin #####";
  this.endTag = "##### " + process.cwd() + " End #####";

  if (dir) {
    var confFile = pathLib.join(process.cwd(), dir || ".config", pathLib.basename(__dirname) + ".json");
    var confDir = pathLib.dirname(confFile);

    if (!fsLib.existsSync(confDir)) {
      Helper.mkdirPSync(confDir);
      fsLib.chmod(confDir, 0777);
    }

    if (!fsLib.existsSync(confFile)) {
      fsLib.writeFileSync(confFile, JSON.stringify(Helper.clone(require("./lib/param")), null, 2), {encoding: "utf-8"});
      fsLib.chmod(confFile, 0777);
    }

    try {
      this.param = Helper.merge(JSON.parse(fsLib.readFileSync(confFile)), param);
    }
    catch (e) {
      console.log("Params Error!");
      this.param = {};
    }

    var self = this;
    fsLib.watch(confFile, function () {
      self.clear();

      self.param = Helper.merge(JSON.parse(fsLib.readFileSync(confFile)), param);

      self.lines();
      self.start();
    });
  }
  else {
    this.param = param;
  }

  this.lines();

  if (sys.path && sys.cmd) {
    var self = this;
    fsLib.watch(sys.path, function () {
      self.display();
      if (typeof sys.cmd == "string") {
        exec(sys.cmd, function() {
          process.emit("reloaded");
        });
      }
      else if (sys.cmd.length == 2) {
        exec(sys.cmd[0], function() {
          exec(sys.cmd[1], function() {
            process.emit("reloaded");
          });
        });
      }
      else {
        console.log("Unknown Command!");
      }
    });

    this.start();
  }
  else {
    console.log("Your system has not been supported!");
    process.exit(0);
  }
};
FlexHosts.prototype = {
  constructor: FlexHosts,
  read: function () {
    this.content = Helper.readFileInUTF8(sys.path);
  },
  display: function () {
    this.read();

    if (this.content) {
      console.log("\n---------------");
      console.log(" Current HOSTS ");
      console.log("---------------");
      console.log(this.content + "\n");
    }
  },
  lines: function () {
    this.hosts = [];
    for (var host in this.param) {
      if (typeof this.param[host] == "string") {
        this.hosts.push(host + "  " + this.param[host]);
      }
      else if (this.param[host] instanceof Array && this.param[host].length) {
        this.hosts.push(host + "  " + this.param[host].join(' '));
      }
    }
  },
  clear: function () {
    if (fsLib.existsSync(sys.path)) {
      this.read();
      this.content = this.content.replace(
        new RegExp("\\s{0,}" + Helper.str2regx(this.beginTag) + "[\\s\\S]*?" + Helper.str2regx(this.endTag) + "\\s{0,}", 'g'),
        ''
      );

      return true;
    }
    else {
      console.log("hosts file NOT FOUND!");
      return false;
    }
  },
  append: function () {
    if (this.hosts.length) {
      this.content += "\n\n" + this.beginTag + "\n" + this.hosts.join("\n") + "\n" + this.endTag;
    }
  },
  write: function () {
    fsLib.writeFile(sys.path, this.content);
  },
  start: function () {
    if (this.clear()) {
      this.append();
      this.write();
    }
  },
  restore: function (cb) {
    process.on("reloaded", function() {
      if (typeof cb == "function") {
        cb();
      }
    });

    if (this.clear()) {
      this.write();
    }
  }
};

exports = module.exports = FlexHosts;