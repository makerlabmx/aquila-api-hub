// api/controllers/ip.js

var localIp = require("ip");
var moira = require("moira");

exports.getIp = function(req, res)
{
  moira.getIP(function(err, ip, service)
    {
      if(err) ip = null;

      var data = {
        localIp: localIp.address(),
        extIp: ip,
        sysTime: new Date()
      };

      res.json(data);
    });

};
