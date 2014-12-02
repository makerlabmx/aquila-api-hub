var Bridge = require("./bridge");
var addressParser = require("./addressParser");
var events = require("events");

var MESH_DEFAULTPAN = 0xCA5A;

var Mesh = function()
{
	var self = this;

	// Constant
	self.AQUILAMESH_MAXPAYLOAD = 105;

	this.PAN = MESH_DEFAULTPAN;

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
					console.log("Bridge EUI Address: ", addressParser.toString(addr));
					self.emit("ready");
				});
			// not really needed because bridge sends it at start...:
			setTimeout(function(){ self.bridge.getLongAddress(); }, 1500);
		});
};

Mesh.prototype.__proto__ = events.EventEmitter.prototype;

var mesh = new Mesh();

module.exports = mesh;