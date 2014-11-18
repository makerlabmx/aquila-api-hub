// wserial.js
/*
	Javascript implementation of Altair's WSerial library.
*/

var mesh = require("./mesh");
var events = require("events");

var WSERIAL_ENDPOINT = 14;

var WSerial = function()
{
	var self = this;
	self.mesh = mesh;

	// self.mesh.on("ready", function()
	// 	{
	//		console.log("WSerial ready");

			self.mesh.bridge.serialPort.on("data", function(packet)
				{
					var data = self.parsePacket(packet);
					if(data) console.log("From ", data.srcAddr, ": ", Buffer(data.data).toString("utf8"));
					if(data) self.emit("data", data);
				});
	// });
};

WSerial.prototype.__proto__ = events.EventEmitter.prototype;

// TODO: Check what to do when message is larger than allowed packet size.
WSerial.prototype.send = function(data)
{
	var self = this;
	self.mesh.bridge.sendData(self.mesh.localAddr, data.dstAddr, 
						 WSERIAL_ENDPOINT, WSERIAL_ENDPOINT, 
						 Buffer(data.data));
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