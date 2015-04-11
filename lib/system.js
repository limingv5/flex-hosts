var os = require("os");
var path = require("path");
var fs = require("fs");

var platform = os.platform();
var sys = {
  path: '',
  cmd: ''
};

if (platform.match(/^win/i)) {
  sys.path = path.join((process.env.SystemRoot || "C:"), "System32", "drivers", "etc", "hosts");
  sys.cmd = "ipconfig /flushdns";
}
else if (platform.match(/darwin/i)) {
  sys.path = "/etc/hosts";
  var version = parseInt(os.release());
  if (version >= 11) {
    var filename = "mDNSResponder";

    if (version >= 14) {
      filename = "discoveryd";
    }

    sys.cmd = [
      "sudo launchctl unload -w /System/Library/LaunchDaemons/com.apple." + filename + ".plist",
      "sudo launchctl load -w /System/Library/LaunchDaemons/com.apple." + filename + ".plist"
    ];
  }
  else {
    sys.cmd = "sudo dscacheutil -flushcache";
  }
}
else {
  sys.path = "/etc/hosts";

  var nscd0 = "/etc/rc.d/init.d/nscd";
  var nscd1 = "/etc/init.d/nscd";
  if (fs.existsSync(nscd1)) {
    sys.cmd = "sudo " + nscd1 + " restart";
  }
  else if (fs.existsSync(nscd0)) {
    sys.cmd = "sudo " + nscd0 + " restart";
  }
  else {
    sys.cmd = "sudo service nscd restart";
  }
}

module.exports = sys;