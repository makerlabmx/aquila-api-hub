/*
 *	802.15.4 Network implementation
 *	Does some processing on packet after mac processing, like security handling
 *	Author: Rodrigo Méndez Gamboa, rmendez@makerlab.mx
 */

var Mac = require("./mac");
var Packet = require("./packet");
var events = require("events");

var Security = function()
{
	this.password = [];
};

// Dummy security implementation
Security.prototype.encrypt = function(packet)
{
	return packet;
};

// Dummy security implementation
Security.prototype.decrypt = function(packet)
{
	return packet;
};

var Net = function()
{
	var self = this;

	this.security = new Security();
	this.secure = false;

	this.mac = new Mac();
	this.mac.on("ready", function()
		{
			self.mac.on("receive", function(packet)
			{
				if(packet.frameControl.securityEnabled && packet.securityHeader.securityControl.readUInt8(0) === Packet.SECCONTROL)
				{
					console.log("Processing secured packet");
					//packet = self.security.decrypt(packet);
					if(!packet) console.log("Secured packet rejected");
				}

				if(packet) self.emit("receive", packet);
			});
			self.emit("ready");
		});
};

Net.prototype.__proto__ = events.EventEmitter.prototype;

// Password for packet decryption
Net.prototype.setPassword = function(pass)
{
	this.security.password = pass;
};

// Enable or disable packet encryption on send
Net.prototype.setSecure = function(isSecure)
{
	this.secure = isSecure;
};

// Receives unencrypted packet
Net.prototype.send = function(packet)
{
	if(!packet) return;
	if(this.secure)
	{
		packet = this.security.encrypt(packet);
	}
	this.mac.send(packet);
};

module.exports = Net;