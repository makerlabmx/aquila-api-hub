var Bridge = require("./bridge");
var addressParser = require("./addressParser");
var events = require("events");
var Packet = require("./meshPacket.js");

var MESH_DEFAULTPAN = 0xCA5A;
var MESH_DEFAULTCHAN = 26;
var MESH_ENDPOINT = 15;
var MESH_CMD_GETEUI = 0;
var MESH_CMD_RESEUI = 1;

var MESH_PING_TIMEOUT = 200;

var Mesh = function()
{
	var self = this;

	// Constant
	self.AQUILAMESH_MAXPAYLOAD = 105;
	self.BROADCAST = 0xFFFF;

	this.PAN = MESH_DEFAULTPAN;
	this.CHANNEL = MESH_DEFAULTCHAN;

	this.bridge = new Bridge();
	this.ready = false;

	// Will get this from bridge
	this.localAddr = 0x00FF;
	this.localEUIAddr = new Buffer([0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
	this.securityEnabled = false;

	if(self.bridge.fake)
	{
		console.log("Started with fake bridge");
		self.ready = true;
		self.emit("ready");
	}

	this.bridge.on("ready", function()
		{
			self.bridge.serialPort.on("longAddrSetConfirm", function(addr)
				{
					addr = new Buffer(addr);
					if(addressParser.compare(addr, self.localEUIAddr)) return;
					self.localEUIAddr = addr;
					console.log("Bridge EUI Address: ", addressParser.toString(addr));
					self.ready = true;
					self.emit("ready");
				});
			// not really needed because bridge sends it at start...:
			setTimeout(function(){ self.bridge.getLongAddress(); }, 1500);

			// Status updaters:
			self.bridge.serialPort.on("securityConfirm", function(enabled)
				{
					self.securityEnabled = enabled;
				});

			self.bridge.serialPort.on("shortAddrSetConfirm", function(addr)
				{
					self.localAddr = addr;
				});

			self.bridge.serialPort.on("panSetConfirm", function(pan)
				{
					self.PAN = pan;
				});

			self.bridge.serialPort.on("chanSetConfirm", function(chan)
				{
					self.CHANNEL = chan;
				});

			// Data handler:
			self.bridge.serialPort.on("data", function(packet)
				{
					self.emit("endpoint" + String(packet.dstEndpoint), packet);
				});

			// Handle GETEUI commands (addr collision already handled by bridge):
			self.openEndpoint(MESH_ENDPOINT, function(packet)
				{
					if(packet.data.length > 0)
					{
						if(packet.data[0] === MESH_CMD_GETEUI)
						{
							self.announce(packet.srcAddr);
						}
						else if(packet.data[0] === MESH_CMD_RESEUI && packet.data.length >= 9)
						{
							var euiAddr = packet.data.slice(1, 9);
							self.emit("gotAnnounce", packet.srcAddr, euiAddr);
						}
					}
				});
		});
};

Mesh.prototype.__proto__ = events.EventEmitter.prototype;

Mesh.prototype.setAddr = function(shortAddr)
{
	var self = this;
	self.localAddr = shortAddr;
	self.bridge.setShortAddress(shortAddr);
};

Mesh.prototype.setPanId = function(panId)
{
	var self = this;
	if(typeof(panId) === "number")
		{
			self.PAN = panId;
			self.bridge.setPan(panId);
		}
};

Mesh.prototype.setChannel = function(channel)
{
	var self = this;
	if(typeof(channel) === "number")
		{
			self.CHANNEL = channel;
			self.bridge.setChannel(channel);
		}
};

// handler must be a function that receives a packet.
Mesh.prototype.openEndpoint = function(endpointN, handler)
{
	var self = this;
	self.on("endpoint" + String(endpointN), handler);
};

Mesh.prototype.getShortAddr = function()
{
	return this.localAddr;
};

Mesh.prototype.getEUIAddr = function()
{
	return this.localEUIAddr;
};

Mesh.prototype.setSecurityKey = function(key)
{
	var self = this;
	self.bridge.setSecurityKey(key);
};

Mesh.prototype.setSecurityEnabled = function(enabled)
{
	var self = this;
	self.bridge.setSecurityEnabled(enabled);
};

Mesh.prototype.getSecurityEnabled = function()
{
	return this.securityEnabled;
};

Mesh.prototype.sendPacket = function(packet, callback)
{
	var self = this;
	self.bridge.sendData(packet.srcAddr, packet.dstAddr, packet.srcEndpoint, packet.dstEndpoint, packet.data, callback);
};

Mesh.prototype.announce = function(dest)
{
	var self = this;
	var data = Buffer.concat([MESH_CMD_RESEUI, self.localEUIAddr]);
	var pkt = new Packet(0xFF, 0xFF,
											self.localAddr,
											dest,
											MESH_ENDPOINT, MESH_ENDPOINT,
											data.length,
											data);
	self.sendPacket(pkt);
};

// Callback must be function(err, srcAddr, srcEUIAddr)
Mesh.prototype.ping = function(dest, callback)
{
	var self = this;
	var packet = new Packet(0xFF, 0xFF,
													self.localAddr,
													dest,
													MESH_ENDPOINT, MESH_ENDPOINT,
													1,
													new Buffer([MESH_CMD_GETEUI]));

	self.sendPacket(packet);

	if(dest !== self.BROADCAST)
	{
		var tout = null;
		var responseCb = function(srcAddr, euiAddr)
		{
			if(tout)
				{
					// If its from the expected address
					if(srcAddr === dest)
						{
							clearTimeout(tout);
							// remove listener for only calling this once
							self.removeListener("gotAnnounce", responseCb);
							if(callback) callback(null, srcAddr, euiAddr);
						}
					}
				};

				tout = setTimeout(function()
				{
					tout = null;
					// Remove callback from event
					self.removeListener("gotAnnounce", responseCb);
					if(callback) callback(new Error("Timeout") );
				}, MESH_PING_TIMEOUT);

				self.on("gotAnnounce", responseCb);
	}
	else if(callback) callback(null, null, null);

};

var mesh = new Mesh();

module.exports = mesh;
