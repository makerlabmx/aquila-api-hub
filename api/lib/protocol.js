/*
 *	Protocol
 *	Action and Event based automation protocol.
 *	Author: Rodrigo Méndez Gamboa, rmendez@makerlab.mx
 */

var Bridge = require("./bridge");
var ProtoPacket = require("./protoPacket");
var events = require("events");
var addressParser = require("./addressParser");

var PROTOCOL_ENDPOINT = 13;
var PROTOCOL_VERSION = 2;

var Protocol = function()
{
	var self = this;

	this.PAN = 0xCA5A;

	this.bridge = new Bridge();
	// Will get this from bridge
	this.localAddr = 0x00FF;
	this.localEUIAddr = new Buffer([0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

	this.bridge.on("ready", function()
	{
		self.bridge.serialPort.on("longAddrSetConfirm", function(addr)
			{
				addr = new Buffer(addr);
				if(addressParser.compare(addr, self.localEUIAddr)) return;
				self.localEUIAddr = addr;
				console.log("Local EUI Address: ", addressParser.toString(addr));
				self.emit("ready");
			});
		// not really needed because bridge sends it at start...:
		setTimeout(function(){ self.bridge.getLongAddress(); }, 1500);
		self.bridge.serialPort.on("data", function(packet)
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

	});

};

Protocol.prototype.__proto__ = events.EventEmitter.prototype;

Protocol.prototype.setPAN = function(pan)
{
	if(typeof(pan) === "number")
	{
		this.PAN = pan;
		this.bridge.setPan(pan);
	}
};

Protocol.prototype.getPAN = function()
{
	return this.PAN;
};

Protocol.prototype.parsePacket = function(packet)
{
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
	this.bridge.sendData(protoPacket.srcAddr, protoPacket.destAddr, 
						 PROTOCOL_ENDPOINT, PROTOCOL_ENDPOINT, 
						 protoPacket.message.getRaw());
};

Protocol.prototype.sendAck = function(destAddr)
{
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = this.localAddr;
	pkt.message.control.commandType = ProtoPacket.CMD_ACK;

	this.send(pkt);
};

Protocol.prototype.sendNAck = function(destAddr)
{
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = this.localAddr;
	pkt.message.control.commandType = ProtoPacket.CMD_NACK;

	this.send(pkt);
};

// destAddr, action and param  must be numbers.
Protocol.prototype.requestAction = function(destAddr, action, param)
{
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = this.localAddr;
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
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = this.localAddr;
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
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = this.localAddr;
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
	var pkt = new ProtoPacket();
	pkt.destAddr = destAddr;
	pkt.srcAddr = this.localAddr;
	pkt.message.control.commandType = ProtoPacket.CMD_CUSTOM;
	if(typeof data !== "undefined" && data !== null)
	{
		pkt.message.control.hasData = true;
		pkt.message.data = data;
	}

	this.send(pkt);
};

module.exports = Protocol;