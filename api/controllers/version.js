// version.js

var pjson = require("./../../package.json");

exports.getVersion = function(req, res)
{
  res.json({ version: pjson.version });
};
