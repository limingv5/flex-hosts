var ROS = require("mikronode");
var util = require("util");
var events = require("events");
var async = require("async");

function Router(serverIP, clientIP, addressList) {
  var self = this;

  var connection = new ROS("192.168.88.1", "admin", '', {timeout: 6});
  connection.closeOnDone(true);

  connection.on("error", function () {
    connection.close(true);
    self.emit("error");
  });

  connection.connect(function (conn) {
    var chan = this.openChannel();
    chan.closeOnDone(true);

    function removeFirewallItem(item, results, cc, callback) {
      var id = '', ids = [];
      var regx = /^=\.id=/;
      results.forEach(function (i) {
        id = i[0];
        if (regx.test(id)) {
          ids.push(id.replace(regx, ''));
        }
      });

      cc.write(["/ip/firewall/" + item + "/remove", "=.id=" + ids.join(',')], function (c) {
        callback(null, c);
      });
    }

    var waterfallArr = [
      function (callback) {
        chan.write(["/ip/firewall/nat/print", "?src-address=" + clientIP, "=.proplist=.id"], function (c) {
          c.once("done", function (results, cc) {
            removeFirewallItem("nat", results, cc, callback);
          });
        });
      },
      function (channel, callback) {
        channel.write(["/ip/firewall/address-list/print", "?list=" + serverIP, "=.proplist=.id"], function (c) {
          c.once("done", function (results, cc) {
            removeFirewallItem("address-list", results, cc, callback);
          });
        });
      }
    ];

    addressList.forEach(function (i) {
      waterfallArr.push(
        function (channel, callback) {
          channel.write(["/ip/firewall/address-list/add", "=list=" + serverIP, "=address=" + i], function (c) {
            callback(null, c);
          });
        }
      );
    });

    async.waterfall(waterfallArr, function (err, channel) {
      channel.write(["/ip/firewall/nat/add", "=chain=dstnat", "=action=dst-nat", "=protocol=tcp",
        "=src-address=" + clientIP, "=to-addresses=" + serverIP, "=dst-address-list=" + serverIP
      ], function () {
        chan.close();
        conn.close();

        self.emit("success");
      });
    });
  });
}

util.inherits(Router, events.EventEmitter);

exports = module.exports = Router;
