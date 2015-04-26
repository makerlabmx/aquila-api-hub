// wserial.js
/*
	Javascript implementation of Altair's WSerial library.
*/

var mesh = require("./mesh");
var events = require("events");
var Packet = require("./meshPacket.js");

var WSERIAL_ENDPOINT = 14;
var WSERIAL_MAXDATA = mesh.AQUILAMESH_MAXPAYLOAD;

var WSerial = function()
{
	var self = this;
	mesh = mesh;

	mesh.openEndpoint(WSERIAL_ENDPOINT, function(packet)
		{
			var data = self.parsePacket(packet);
			//if(data) console.log(Buffer(data.data).toString('utf8'));
			if(data)
			{
				// convert data to string
				data.data = new Buffer(data.data).toString("utf8");
				self.emit("data", data);
			}
		});
};

WSerial.prototype.__proto__ = events.EventEmitter.prototype;

WSerial.prototype.send = function(data)
{
	var self = this;
	// If data is longer than allowed, divide it and send it in chunks:
	var dt = new Buffer(data.data);
	var remaining = dt.slice();

	while(remaining.length > 0)
	{
		var chunk = remaining.slice(0, WSERIAL_MAXDATA - 1);
		remaining = remaining.slice(WSERIAL_MAXDATA - 1);

		var packet = new Packet(0xFF, 0xFF, mesh.localAddr, data.dstAddr,
			WSERIAL_ENDPOINT, WSERIAL_ENDPOINT, chunk.length,
			chunk);

		mesh.sendPacket(packet);
	}

};

WSerial.prototype.parsePacket = function(packet)
{
	try
	{
		// Check if its a wserial packet
		if(packet.srcEndpoint !== WSERIAL_ENDPOINT || packet.dstEndpoint !== WSERIAL_ENDPOINT) return false;
		var data = {
			srcAddr: packet.srcAddr,
			destAddr: packet.dstAddr,
			data: packet.data
		};

		return data;
	}
	catch(err)
	{
		return false;
	}
};

var wserial = new WSerial();
module.exports = wserial;
