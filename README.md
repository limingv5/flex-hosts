# FlexHosts

> Support Mac OS X, Windows, Linux

```
var flexHosts = require("flex-hosts");

flexHosts(hostsMap, [dir]);
```

## Arguments

### hostsMap

```
{
  "127.0.0.1": [
    "g.cdn.cn",
    "a.cdn.cn"
  ],
  "127.0.0.2": "t.cdn.cn o.cdn.cn"
}
```

* The value relevant to key could be Array or String.

### [dir]

The DIR where puts the hostsMap file


## How does it refresh DNS in Mac OS X?

### IF Yosemite
```
sudo launchctl unload -w /System/Library/LaunchDaemons/com.apple.discoveryd.plist

sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.discoveryd.plist
```

### IF Mavericks || Mountain Lion || Lion
```
sudo launchctl unload -w /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist

sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist
```

### IF Lower than Lion
```
sudo dscacheutil -flushcache
```

So if you meet the situation that your computer is something wrong with remote host resolving, please repeat the command(s) above!
