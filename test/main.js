var FlexHosts = require("../");

var flexHosts = new FlexHosts({
  "127.0.0.1": [
    "a.com"
  ],
  "127.3.0.1": [
    "www.baidu.com",
    "www.qq.com",
    "a.tbcdn.cn"
	]
});

	var flex2 = new FlexHosts({
		"127.3.4.1": [
	    "a.tbcdn.cn",
	    "www.qq.com"
	  ]
	},true)
setTimeout(function(){
	flex2.commit();
},5000)
// var flex2 = new FlexHosts({
// 	"127.3.4.1": [
//     "a.tbcdn.cn",
//     "www.qq.com"
//   ]
// });

// setTimeout(function(){
// 	flexHosts.commit();
// },3000)
// setTimeout(function(){
// 	var c = flexHosts.write({
// 	  "127.3.4.1": [
// 	    "a.tbcdn.cn",
// 	    "www.qq.com"
// 	  ]
// 	}).insert({
// 		"127.0.0.1": [
//     "a.com",
//     "www.baidu.com"
//   ]}).commit().commit();
// },2000)

