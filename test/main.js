var FlexHosts = require("../");

var flexHosts = new FlexHosts({
  "127.0.0.1": [
    "g.tbcdn.cn",
    "a.tbcdn.cn",
    "s.tbcdn.cn",
    "g.alicdn.com",
    "assets.alicdn.com"
  ]
});

var timer = setTimeout(function() {
  flexHosts.restore(function() {
    clearTimeout(timer);
  })
}, 3000);
