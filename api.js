var fsLib = require("fs");
var dns = require("dns");
var util = require("util");
var exec = require("child_process").exec;
var async = require("async");
var sys = require("./lib/system");

var flexHostsReg = /#{5}.*Begin\s{0,}#{5}[\s\S]*#{5}.*End\s{0,}#{5}/g;
function str2regx(str) {
  return str.replace(/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g, "\\$&");
}
function addComment(param){
  var param = param.replace(flexHostsReg,'');
  return param.trim().split('\n').map(function(line){
    if (!!~line.indexOf('##flex-hosts comment##') || !!~line.indexOf('##your comment##')){
      return line;
    }
    if (/\s*#{1,}/.test(line)){
      return '##your comment##  '+line;
    }
    return '##flex-hosts comment##  '+line;
  }).join('\n');
}
function FlexHosts(param, confFile, cb , isGroup) {
  this.param = '';
  this.confFile = confFile;
  this.content = '';
  this.cb = cb;
  this.errTimes = 0;
  this.cmdList = [];
  this.isFree = true;
  this.beginTag = "##### " + process.cwd() + " Begin #####";
  this.endTag = "##### " + process.cwd() + " End   #####";
  this.backup = this.read();
  this.hostReg = new RegExp("\\s{0,}" + str2regx(this.beginTag) + "[\\s\\S]*?" + str2regx(this.endTag) + "\\s{0,}", 'g');

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

  this.write(this.param);
  if (!isGroup){
    this.commit();
  }
 
  return this;
}

var flexHostsReg = /#{5}.*Begin\s{0,}#{5}[\s\S]*#{5}.*End\s{0,}#{5}/g;
FlexHosts.prototype = {
  constructor: FlexHosts,
  _stringify: function(hosts){
    var hostList = {};
    var hostsTextArr = [];
    if (typeof hosts == "string"){
      //过滤注释
      hosts = hosts.split('\n').map(function(flexHost){
        if (!!~flexHost.indexOf('#')){
          var pattern = '##flex-hosts comment##';
          if (!!~flexHost.indexOf(pattern)){
            return flexHost.substr(flexHost.indexOf(pattern)+pattern.length).trim();
          }
          return ''
        }
        return flexHost;
      }).filter(function(flexHost){
        return flexHost && flexHost.length;
      }).join('\n');
      //并转为对象
      hosts = this._parse(hosts);
    }
    for (var ip in hosts) {
      if (typeof hosts[ip] == "string") {
        hosts[ip] = hosts[ip].split(/\s{1,}/g);
      }
      if (util.isArray(hosts[ip]) && hosts[ip].length) {
        //去重
        for (var i=0,l=hosts[ip].length; i<l; ++i){
          hostList[hosts[ip][i]] = ip;
        }
      }
    }
    //重组
    hosts = [];
    for (var host in hostList){
      var ip = hostList[host];
      if (hosts[ip]){
        hosts[ip] += (" "+host);
      }else{
        hosts[ip] = host;
      }
    }
    for (var ip in hosts){
      hostsTextArr.push(ip + "  " + hosts[ip]);
    }
    return hostsTextArr.join("\n").trim();
  },
  _parse: function(param){
    if (!param) return this.param;
    if (typeof param == 'object') return param;
    if (typeof param != 'string' || param.length == 0) return this.param;
    var wrapReg = new RegExp("\\s{0,}" + str2regx(this.beginTag) + "([\\s\\S]*?)" + str2regx(this.endTag) + "\\s{0,}", 'g');
    var paramStr = wrapReg.test(param) ? wrapReg.exec(param)[1].trim() : param;
    var hostsTextArr = paramStr.split("\n");
    var hosts = {};
    for (var i=0 ,l=hostsTextArr.length; i < l; ++i){
      var ip = hostsTextArr[i].substr(0,hostsTextArr[i].indexOf(' ')).trim();
      var hostList = hostsTextArr[i].substr(hostsTextArr[i].indexOf(' ')).trim().split(' ');
      hosts[ip] = hostList;
    }
    return hosts;
  },
  _hostfunc: function (hosts) {
    var hostsFuncArr = [];
    for (var ip in hosts){
      for (var i = 0, len = hosts[ip].length; i < len; i++) {
        hostsFuncArr.push((function (host) {
          return function (callback) {
            dns.resolve(host, function (e, address) {
              if (e) {
                console.log("Warning: \x1b[33m%s\x1b[0m can't be resolved!", e.hostname || host);
                callback(null, host, null);
              }
              else {
                callback(null, host, address[0]);
              }
            });
          }
        })(hosts[ip][i]));
      }
    }
    return hostsFuncArr;
  },
  _composite: function (str) {
    var content = "";
    if (str.length) {
      content = "\n\n" + this.beginTag + "\n" + str.trim() + "\n" + this.endTag;
    }
    return content;
  },
  _reload: function (cb) {
    var self = this;
    if (typeof sys.cmd == "string") {
      exec(sys.cmd, function (err) {
        if (err){
          self.cb(err);
        }
        cb(err);
      });
    }
    else if (util.isArray(sys.cmd) && sys.cmd.length == 2) {
      exec(sys.cmd[0], function (err) {
        if (err){
          self.cb(err);
          cb(err);
          return;
        }
        exec(sys.cmd[1], function (err) {
          if (err){
           self.cb(err);
          }
          cb(err);
        });
      });
    }
    else {
      console.log("Unknown Command!");
    }
  },
  _dispatch: function(){
    if (this.cmdList.length === 0) return;
    var oc = this.cmdList.shift().split(':');
    var operate = oc[0];
    var param = oc[1];
    switch(operate){
      case 'write':
        this.write(param);
      break;
      case 'insert':
       this.insert(param);
      break;
      case 'delete':
       this.delete(param);
      break;
      case 'commit':
       this._commit();
      break;
    }
  },
  _commit: function (cb) {
    var self = this;
    var data = addComment(self.backup); 
    if (flexHostsReg.test(self.backup)){
      var otherFlexHosts = self.backup.split(/\n\n/g)
                            .filter(function(flexHost){
                              return flexHostsReg.test(flexHost) && !self.hostReg.test(flexHost);
                            }).join('\n\n');
      data += ('\n\n' + otherFlexHosts);//其他项目生成的
    }
    data += ('\n\n' + self._composite(self.content));
    self.isFree = false;
    fsLib.writeFileSync(sys.path, data);
    //将修改存入param.js

    self.param = self._parse(self.content.trim());

    if (self.confFile) {
      fsLib.writeFileSync(self.confFile, JSON.stringify(self.param, null, 2));
      fsLib.chmod(self.confFile, 0777);
    }

    async.series([self._reload.bind(self),self.map.bind(self)],function(err,result){
      if (err){
        self.cb(err);
        return;
      }
      self.isFree = true;
      self._dispatch();
    });
  },
  read: function (){
    var content = fsLib.readFileSync(sys.path, "utf-8");
    return content;
  },
  write: function(param) {
    if (!this.isFree){
      var cmd = 'write:' + this._stringify(param);
      this.cmdList.push(cmd);
      return this;
    }
    this.content = this._stringify(param);
    this.insert(this.backup.replace(flexHostsReg,''));
    this._dispatch();
    return this;
  },
  insert: function(param){
    if (!this.isFree){
      var cmd = 'insert:' + this._stringify(param);
      this.cmdList.push(cmd);
      return this;
    }
    this.content = this._stringify(this.content + '\n' +this._stringify(param));
    this._dispatch();
    return this;
  },
  delete: function(param){
    if (!this.isFree){
      var cmd = 'delete:' + param;
      this.cmdList.push(cmd);
      return this;
    }
    var hostList = this._parse(this.content);
    for (var ip in hostList){
      if (new RegExp(ip).test(param)){
        delete hostList[ip];
        continue;
      }
      hostList[ip] = hostList[ip].filter(function(host){
        return !(new RegExp(str2regx(host)).test(param));
      })
      if (!hostList[ip].length){
        delete hostList[ip];
      }
    }
    this.content = this._stringify(hostList);
    this._dispatch();
    return this;
  },
  commit: function() {
    if (!this.isFree){
      var cmd = 'commit';
      this.cmdList.push(cmd);
      return this;
    }
    this._commit();
    this._dispatch();
    return this;
  },
  clear: function (cb) {
    if (fsLib.existsSync(sys.path)) {
      var content = this.read();

      try {
        fsLib.writeFileSync(sys.path + ".backup", content);
      }
      catch (e) {
        cb && cb(e);
      }
      //还原文件
      content = content.replace(this.hostReg,'')
                       .replace(str2regx('##your comment##  '),'')
                       .replace(str2regx('##flex-hosts comment##  '),'');
      try {
        fsLib.writeFileSync(sys.path, content);
      }
      catch (e) {
        cb && cb(e);
      }
      cb && cb(null,content);
      return true;
    }
    else {
      console.log("hosts file NOT FOUND!");
      cb && cb("hosts file NOT FOUND!");
      return false;
    }
  },
  restore: function () {
    if (this.clear()) {
      console.log("\x1b[32m%s\x1b[0m\n", "Bye-bye!");
      process.exit();
    }
  },
  map: function(cb){
    var self = this;
    console.log(" Maping...");
    dns.lookup("ju.taobao.com", function (err) {
      if (err) {
        self.cb(err, null);
        self.errTimes++;
        //尝试三次 失败结束进程
        if (self.errTimes >= 3){
          console.log("\x1b[32m%s\x1b[0m\n", "Start Failed!");
          self.restore();
        }
        console.log("\x1b[32m%s\x1b[0m\n", "Failed:try to restart "+self.errTimes);
          self._reload(function(err){
            if (err) {
              console.log("\x1b[32m%s\x1b[0m\n", "Start Failed!");
              self.restore();
            }
            setTimeout(function(){
              self.map();
            },2000);
          });
        return;
      }
      var hostfunc = self._hostfunc(self._parse(self.content));
      async.parallel(hostfunc, function (e, result) {
        var host, ip,host2ip = {};
        for (var i = 0, len = result.length; i < len; i++) {
          if (result[i]) {
            host = result[i][0];
            ip = result[i][1];
            if (host && ip && ip != "127.0.0.1") {
              host2ip[host] = ip;
            }
          }
        }
        if (self.content && self.content.length){
          console.log("\n---------------");
          console.log(" Current HOSTS");
          console.log("---------------");
          console.log("\x1b[37m%s\x1b[0m\n", self.content);
          console.log("\n-------------------");
        }
        if (result.length){
          console.log(" MAP of host to IP");
          console.log("-------------------");
          console.log("\x1b[37m%s\x1b[0m\n", JSON.stringify(host2ip, null, 2));
        }
        if (cb){
          cb(err);
        }
        self.cb(null, host2ip); 
      });
    });
  }
};

exports = module.exports = FlexHosts;
