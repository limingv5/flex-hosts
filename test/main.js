var FlexHosts = require("../api");
var param = require("../lib/param");

var flexHosts = new FlexHosts(param);

var timer = setTimeout(function() {
  flexHosts.restore(function() {
    clearTimeout(timer);
  })
}, 3000);
