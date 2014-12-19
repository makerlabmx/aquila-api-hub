// api/controllers/wserial.js

var wserial = require("./../lib/wserial");

exports.sendData = function(req, res)
{
	if(req.body.dstAddr === undefined || req.body.data === undefined) return res.send(401, 'Missing dstAddr or data');

	wserial.send(req.body);
	res.status(204).send();
};
