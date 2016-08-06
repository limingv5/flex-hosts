var fsLib = require("fs");
var dns = require("dns");
var util = require("util");
var exec = require("child_process").exec;
var async = require("async");
var sys = require("./lib/system");

var DNSLookup = function(domain, timeout, callback) {
  var callbackCalled = false;
  var doCallback = function(err, domains) {
    if (!callbackCalled) {
      callbackCalled = true;
      callback(err, domains);
    }
    else {
      clearTimeout(t);
      t = null;
    }
  };

  var t = setTimeout(function() {
    doCallback(new Error("Timeout exceeded"), null);
  }, timeout);

  dns.resolve(domain, doCallback);
};

var str2regx = function(str) {
  return str.replace(/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g, "\\$&");
};

function FlexHosts(param, confFile, cb) {
  this.cb = cb;
  this.host2ip = {};
  this.hostsFuncArr = [];
  this.hostsTextArr = [];
  this.content = '';

  this.beginTag = "##### " + process.cwd() + " Begin #####";
  this.endTag = "##### " + process.cwd() + " End   #####";

  if (confFile) {
    if (!fsLib.existsSync(confFile)) {
      fsLib.writeFileSync(confFile, JSON.stringify(require("./lib/param"), null, 2), {encoding: "utf-8"});
      fsLib.chmod(confFile, 0777);
    }

    try {
      this.param = JSON.parse(fsLib.readFileSync(confFile));

      for (var ip in param) {
        if (this.param[ip]) {
          this.param[ip] = this.param[ip].concat(param[ip]);
        }
        else {
          this.param[ip] = param[ip];
        }
      }
    }
    catch (e) {
      console.log("Params Error!");
      this.param = {};
    }
  }
  else {
    this.param = param;
  }

  var hostList;
  for (var host in this.param) {
    hostList = [];
    if (typeof this.param[host] == "string") {
      hostList = this.param[host].split(/\s{1,}/g);
    }
    else if (util.isArray(this.param[host]) && this.param[host].length) {
      hostList = this.param[host];
      hostList = hostList.filter(function (elem, pos) {
        return hostList.indexOf(elem) == pos;
      });
    }

    if (hostList && hostList.length) {
      this.hostsTextArr.push(host + "  " + hostList.join(' '));
      this.hostfunc(hostList);
    }
  }

  DNSLookup("ju.taobao.com", 5000, function (err) {
    if (err) {
      this.start(err);
    }
    else {
      async.parallel(this.hostsFuncArr, (function (e, result) {
        var host, ip;
        for (var i = 0, len = result.length; i < len; i++) {
          if (result[i]) {
            host = result[i][0];
            ip = result[i][1];
            if (host && ip && ip != "127.0.0.1") {
              this.host2ip[host] = ip;
            }
          }
        }
        console.log("\n-------------------");
        console.log(" MAP of host to IP");
        console.log("-------------------");
        console.log("\x1b[37m%s\x1b[0m\n", JSON.stringify(this.host2ip, null, 2));

        this.start(null);
      }).bind(this));
    }
  }.bind(this));

  return this;
}

FlexHosts.prototype = {
  constructor: FlexHosts,
  read: function () {
    this.content = fsLib.readFileSync(sys.path, "utf-8");
  },
  hostfunc: function (hosts) {
    for (var i = 0, len = hosts.length; i < len; i++) {
      this.hostsFuncArr.push((function (host) {
        return function (callback) {
          DNSLookup(host, 5000, function(e, address) {
            if (e) {
              console.log("Warning: \x1b[33m%s\x1b[0m can't be resolved!", e.hostname || host);
              callback(null, host, null);
            }
            else {
              callback(null, host, address[0]);
            }
          });
        }
      })(hosts[i]));
    }
  },
  finish: function (isStart) {
    this.read();

    if (this.content) {
      console.log("\n---------------");
      console.log(" Current HOSTS");
      console.log("---------------");
      console.log("\x1b[37m%s\x1b[0m\n", this.content);
    }

    if (isStart) {
      this.cb(null, this.host2ip);
    }
    else {
      console.log("\x1b[32m%s\x1b[0m\n", "Bye-bye!");
      process.exit();
    }
  },
  write: function (isStart) {
    var self = this;
    fsLib.writeFile(sys.path, this.content, function () {
      if (typeof sys.cmd == "string") {
        exec(sys.cmd, function () {
          self.finish(isStart);
        });
      }
      else if (util.isArray(sys.cmd) && sys.cmd.length == 2) {
        exec(sys.cmd[0], function () {
          exec(sys.cmd[1], function () {
            self.finish(isStart);
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
      this.content = this.beginTag + "\n" + this.hostsTextArr.join("\n") + "\n" + this.endTag + "\n\n" + this.content;
    }
  },
  clear: function () {
    if (fsLib.existsSync(sys.path)) {
      this.read();

      try {
        fsLib.writeFileSync(sys.path + ".backup", this.content);
      }
      catch (e) {
      }

      this.content = this.content.replace(
        new RegExp("\\s{0,}" + str2regx(this.beginTag) + "[\\s\\S]*?" + str2regx(this.endTag) + "\\s{0,}", 'g'),
        ''
      );

      return true;
    }
    else {
      console.log("hosts file NOT FOUND!");
      return false;
    }
  },
  start: function (err) {
    if (err) {
      this.cb(err, this.host2ip);
    }
    else if (this.clear()) {
      this.add();
      this.write(true);
    }
  },
  restore: function () {
    if (this.clear()) {
      this.write(false);
    }
  }
};

module.exports = FlexHosts;
