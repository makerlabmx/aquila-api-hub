"use strict";

// api/controllers/wserial.js

var deviceManager = require("./deviceManager");

exports.sendData = function(req, res)
{
	if(req.body.dstAddr === undefined || req.body.data === undefined) return res.send(401, 'Missing dstAddr or data');

	deviceManager.sendWSerial(req.body.dstAddr, req.body.data);
	res.status(204).send();
};
