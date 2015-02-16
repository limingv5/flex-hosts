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
  }
  else {
    this.param = param;
  }

  for (var host in this.param) {
    if (typeof this.param[host] == "string") {
      this.hosts.push(host + "  " + this.param[host]);
      this.add2map(this.param[host]);
    }
    else if (util.isArray(this.param[host]) && this.param[host].length) {
      this.hosts.push(host + "  " + this.param[host].join(' '));
      for (var i = 0, len = this.param[host].length; i < len; i++) {
        this.add2map(this.param[host][i]);
      }
    }
  }
  var IPS = [];
  for (var host in this.host2ip) {
    if (!this.host2ip[host]) {
      IPS.push((function (host) {
        return function (callback) {
          dns.resolve4(host, function (e, address) {
            callback(e, host, address[0]);
          });
        }
      })(host));
    }
  }
  async.parallel(IPS, (function (e, result) {
    for (var i = 0, len = result.length; i < len; i++) {
      this.host2ip[result[i][0]] = result[i][1];
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
  add2map: function (host) {
    if (typeof this.host2ip[host] == "undefined") {
      this.host2ip[host] = '';
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
  add: function() {
    if (this.hosts.length) {
      this.content += "\n\n" + this.beginTag + "\n" + this.hosts.join("\n") + "\n" + this.endTag;
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