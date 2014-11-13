/*
 *	802.15.4 Mac implementation
 *	Author: Rodrigo Méndez Gamboa, rmendez@makerlab.mx
 */

var Bridge = require("./bridge");
var Packet = require("./packet");
var config = require("./../../config/bridge");
var events = require("events");

var Mac = function(baudrate, port)
{
	var self = this;
	this.bridge = new Bridge(config.baudrate, config.port);

	this.bridge.on("ready", function()
	{
		self.bridge.serialPort.on("data", function(data)
		{
			var packet = new Packet(new Buffer(data.data));
			if(packet) self.emit("receive", packet);
		});

		self.emit("ready");
	});
};

Mac.prototype.__proto__ = events.EventEmitter.prototype;

// gets a Packet instance
Mac.prototype.send = function(packet)
{
	this.bridge.sendData(packet.getRaw());
};

module.exports = Mac;