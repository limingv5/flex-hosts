var os = require("os");
var path = require("path");

var platform = os.platform();
var sys = {
  path: '',
  cmd: ''
};

if (platform.match(/^win/i)) {
  sys.path = path.join(process.env.SystemRoot || "C:", [path.sep + 'System32', 'drivers', 'etc', 'hosts'].join(path.sep));
  sys.cmd = "ipconfig /flushdns";
}
else if (platform.match(/darwin/i)) {
  sys.path = "/etc/hosts";
  var version = parseInt(os.release());
  if (version >= 14) {
    sys.cmd = [
      "sudo launchctl unload -w /System/Library/LaunchDaemons/com.apple.discoveryd.plist",
      "sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.discoveryd.plist"
    ];
  }
  else if (version >= 11) {
    sys.cmd = [
      "sudo launchctl unload -w /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist",
      "sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist"
    ];
  }
  else {
    sys.cmd = "sudo dscacheutil -flushcache";
  }
}
else {
  // Linux Not covered
}



module.exports = sys;