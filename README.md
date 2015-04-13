# FlexHosts

> Support Mac OS X, Windows, Linux

```
var flexHosts = require("flex-hosts");

flexHosts(hostsMap, [dir,] function (err, hosts) {
  ...
});
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
