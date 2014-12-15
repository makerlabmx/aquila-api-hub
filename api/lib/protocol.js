/*
 *	Protocol
 *	Action and Event based automation protocol.
 *	Author: Rodrigo Méndez Gamboa, rmendez@makerlab.mx
 */

var mesh = require("./mesh");
var ProtoPacket = require("./protoPacket");
var events = require("events");

var PROTOCOL_ENDPOINT = 13;
var PROTOCOL_VERSION = ProtoPacket.PROTOCOL_VERSION;

var Protocol = function()
{
	var self = this;

	//Command definitions:

	self.NACK = 0;
	self.ACK = 1;
	self.ACTION = 2;
	self.GET = 3;
	self.POST = 4;
	self.CUSTOM = 5;

	self.COM_NACTIONS = 0;
	self.COM_NEVENTS = 1;
	self.COM_CLASS = 2;
	self.COM_SIZE = 3;
	self.COM_NENTRIES = 4;
	self.COM_ABSENTRY = 5;
	self.COM_ENTRY = 6;
	self.COM_CLEAR = 7;
	self.COM_ADDENTRY = 8;
	self.COM_DELABSENTRY = 9;
	self.COM_DELENTRY = 10;
	self.COM_ACTION = 11;
	self.COM_EVENT = 12;
	self.COM_NAME = 13;
	self.COM_EUI = 14;

	mesh.on("ready", function()
	{
		mesh.openEndpoint(PROTOCOL_ENDPOINT, function(packet)
		{
			var protoPacket = self.parsePacket(packet);
			if(protoPacket)
			{
				switch(protoPacket.message.control.commandType)
				{
					case ProtoPacket.CMD_ACK:
						self.emit("ack", protoPacket);
						break;
					case ProtoPacket.CMD_NACK:
						self.emit("nack", protoPacket);
						break;
					case ProtoPacket.CMD_ACTION:
						self.emit("action", protoPacket);
						break;
					case ProtoPacket.CMD_GET:
						self.emit("get", protoPacket);
						break;
					case ProtoPacket.CMD_POST:
						self.emit("post", protoPacket);
						break;
					case ProtoPacket.CMD_CUSTOM:
						self.emit("custom", protoPacket);
						break;
					case ProtoPacket.CMD_EVENT:
						self.emit("event", protoPacket);
						break;
				}
				self.emit(String(protoPacket.srcAddr), protoPacket);
				self.emit("receive", protoPacket);
			}
		});

		self.emit("ready");

	});

};

Protocol.prototype.__proto__ = events.EventEmitter.prototype;

Protocol.prototype.parsePacket = function(packet)
{
	var self = this;
	// Should check if its a valid packet... TODO
	try
	{
		// Check if its a protocol packet
		if(packet.srcEndpoint !== PROTOCOL_ENDPOINT || packet.dstEndpoint !== PROTOCOL_ENDPOINT) return false;
		var pkt = new ProtoPacket();
		pkt.srcAddr = packet.srcAddr;
		pkt.destAddr = packet.dstAddr;

		pkt.message.fromRaw(packet.data);

		// check if correct PROTOCOL_VERSION
		if(pkt.message.version !== PROTOCOL_VERSION) return false;

		return pkt;
	}
	catch(err)
	{
		return false;
	}

};

Protocol.prototype.send = function(protoPacket)
{
	mesh.bridge.sendData(protoPacket.srcAddr, protoPacket.destAddr,
						 PROTOCOL_ENDPOINT, PROTOCOL_ENDPOINT,
						 protoPacket.message.getRaw());
};

Protocol.prototype.sendAck = function(destAddr)
{
	var self = this;
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = mesh.getShortAddr();
	pkt.message.control.commandType = ProtoPacket.CMD_ACK;

	this.send(pkt);
};

Protocol.prototype.sendNAck = function(destAddr)
{
	var self = this;
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = mesh.getShortAddr();
	pkt.message.control.commandType = ProtoPacket.CMD_NACK;

	this.send(pkt);
};

// destAddr, action and param  must be numbers.
Protocol.prototype.requestAction = function(destAddr, action, param)
{
	var self = this;
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = mesh.getShortAddr();
	pkt.message.control.commandType = ProtoPacket.CMD_ACTION;
	if(typeof param !== "undefined" && param !== null)
	{
		pkt.message.control.hasParam = true;
		pkt.message.param = new Buffer(1);
		pkt.message.param.writeUInt8(param, 0);
	}
	pkt.message.command = new Buffer(1);
	pkt.message.command.writeUInt8(action, 0);

	this.send(pkt);
};

// Data must be a buffer
Protocol.prototype.requestGet = function(destAddr, command, param, data)
{
	var self = this;
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = mesh.getShortAddr();
	pkt.message.control.commandType = ProtoPacket.CMD_GET;
	if(typeof param !== "undefined" && param !== null)
	{
		pkt.message.control.hasParam = true;
		pkt.message.param = new Buffer(1);
		pkt.message.param.writeUInt8(param, 0);
	}
	if(typeof data !== "undefined" && data !== null)
	{
		pkt.message.control.hasData = true;
		pkt.message.data = data;
	}
	pkt.message.command = new Buffer(1);
	pkt.message.command.writeUInt8(command, 0);

	this.send(pkt);
};

// Data must be a buffer
Protocol.prototype.requestPost = function(destAddr, command, param, data)
{
	var self = this;
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = mesh.getShortAddr();
	pkt.message.control.commandType = ProtoPacket.CMD_POST;
	if(typeof param !== "undefined" && param !== null)
	{
		pkt.message.control.hasParam = true;
		pkt.message.param = new Buffer(1);
		pkt.message.param.writeUInt8(param, 0);
	}
	if(typeof data !== "undefined" && data !== null)
	{
		pkt.message.control.hasData = true;
		pkt.message.data = data;
	}
	pkt.message.command = new Buffer(1);
	pkt.message.command.writeUInt8(command, 0);

	this.send(pkt);
};

// Data must be a buffer
Protocol.prototype.requestCustom = function(destAddr, data)
{
	var self = this;
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = mesh.getShortAddr();
	pkt.message.control.commandType = ProtoPacket.CMD_CUSTOM;
	if(typeof data !== "undefined" && data !== null)
	{
		pkt.message.control.hasData = true;
		pkt.message.data = data;
	}

	this.send(pkt);
};

module.exports = Protocol;
