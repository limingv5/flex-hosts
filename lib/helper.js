var fs = require("fs");
var isUtf8 = require("is-utf8");
var iconv = require("iconv-lite");
var utilLib = require("mace")(module);

exports.encode = function(content, charset) {
  return iconv.encode(content, charset);
};
exports.decode = function (buff) {
  return isUtf8(buff) ? buff.toString() : iconv.decode(buff, "gbk");
};
exports.readFileInUTF8 = function(fullpath) {
  return exports.decode(fs.readFileSync(fullpath));
};

exports.merge = utilLib.merge;
exports.mkdirPSync = utilLib.mkdirPSync;
exports.clone = utilLib.clone;