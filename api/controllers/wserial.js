// api/controllers/wserial.js

var wserial = require("./../lib/wserial");

var WSERIAL_MAXDATA = wserial.mesh.AQUILAMESH_MAXPAYLOAD;

exports.sendData = function(req, res)
{
	if(req.body.dstAddr === undefined || req.body.data === undefined) return res.send(401, 'Missing dstAddr or data');

	// Making a copy of the message for modification
	var msg = {
		dstAddr: req.body.destAddr,
		data: req.body.data
	};

	// TODO: test
	// If the message is longer than allowed, it will be sent in parts until everything is sent:
	while(msg.data.length > 0)
	{
		// Cutting a slice:
		var part = {
			destAddr: msg.destAddr,
			data: msg.data.slice(0, WSERIAL_MAXDATA);
		};
		// Sending the part:
		wserial.send(part);
		// Updating msg, deleting the part that was sent.
		msg.data = msg.data.slice(WSERIAL_MAXDATA);
	}
	res.status(204).send();
};