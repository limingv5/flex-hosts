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
  "127.0.0.2": [
    "..."
  ]
}
```

### [dir]

The DIR where puts the hostsMap file