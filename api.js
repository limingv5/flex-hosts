var pathLib = require("path");
var fsLib = require("fs");
var dns = require("dns");
var util = require("util");
var events = require("events");
var exec = require("child_process").exec;
var async = require("async");
var Helper = require("./lib/helper");
var sys = require("./lib/system");

function FlexHosts(param, dir) {
  param = param || {};
  this.host2ip = {};
  this.hostsFuncArr = [];
  this.hostsTextArr = [];
  this.content = '';

  this.beginTag = "##### " + process.cwd() + " Begin #####";
  this.endTag = "##### " + process.cwd() + " End   #####";

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
  }
  else {
    this.param = param;
  }

  for (var host in this.param) {
    if (typeof this.param[host] == "string") {
      this.hostsTextArr.push(host + "  " + this.param[host]);
      this.hostfunc([this.param[host]]);
    }
    else if (util.isArray(this.param[host]) && this.param[host].length) {
      this.hostsTextArr.push(host + "  " + this.param[host].join(' '));
      this.hostfunc(this.param[host]);
    }
  }
  async.parallel(this.hostsFuncArr, (function (e, result) {
    var host, ip;
    for (var i = 0, len = result.length; i < len; i++) {
      if (!result[i]) {
        continue;
      }

      host = result[i][0];
      ip = result[i][1];
      if (host && ip && ip != "127.0.0.1") {
        this.host2ip[host] = ip;
      }
    }
    console.log("\n-------------------");
    console.log(" MAP of host to IP ");
    console.log("-------------------");
    console.log(this.host2ip);

    this.start();
  }).bind(this));

  return this;
};

util.inherits(FlexHosts, events.EventEmitter);

FlexHosts.prototype = Helper.merge(true, FlexHosts.prototype, {
  constructor: FlexHosts,
  read: function () {
    this.content = Helper.readFileInUTF8(sys.path);
  },
  hostfunc: function (hosts) {
    for (var i = 0, len = hosts.length; i < len; i++) {
      this.hostsFuncArr.push((function (host) {
        return function (callback) {
          dns.resolve(host, function (e, address) {
            if (e) {
              console.log((e.hostname || host) + " can't be resolved!");
              callback(e, host, null);
            }
            else {
              callback(e, host, address[0]);
            }
          });
        }
      })(hosts[i]));
    }
  },
  display: function () {
    this.read();

    if (this.content) {
      console.log("\n---------------");
      console.log(" Current HOSTS ");
      console.log("---------------");
      console.log(this.content + "\n");
    }

    this.emit("refreshed", this.host2ip);
  },
  write: function () {
    var self = this;
    fsLib.writeFile(sys.path, this.content, function () {
      if (typeof sys.cmd == "string") {
        exec(sys.cmd, function () {
          self.display();
        });
      }
      else if (util.isArray(sys.cmd) && sys.cmd.length == 2) {
        exec(sys.cmd[0], function () {
          exec(sys.cmd[1], function () {
            self.display();
          });
        });
      }
      else {
        console.log("Unknown Command!");
      }
    });
  },
  add: function () {
    if (this.hostsTextArr.length) {
      this.content += "\n\n" + this.beginTag + "\n" + this.hostsTextArr.join("\n") + "\n" + this.endTag;
    }
  },
  clear: function () {
    if (fsLib.existsSync(sys.path)) {
      this.read();
      fsLib.writeFile(sys.path + ".backup", this.content);

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
  start: function () {
    if (this.clear()) {
      this.add();
      this.write();
    }
  },
  restore: function () {
    if (this.clear()) {
      this.write();
    }
  }
});

exports = module.exports = FlexHosts;