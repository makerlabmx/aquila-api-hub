// services.js
/*
	Javascript implementation of Aquila Services
*/

var mesh = require("./mesh");
var events = require("events");
var Packet = require("./meshPacket.js");

var AQUILASERVICES_ENDPOINT = 12;
var AQUILASERVICES_VERSION = 1;

var AQUILASERVICES_MAXNAMESIZE = 16;
var AQUILASERVICES_MAXDATASIZE = mesh.AQUILAMESH_MAXPAYLOAD - 4;

var AQUILASERVICES_TIMEOUT = 1000;

var Services = function()
{
	var self = this;

	self.requestPending = false;
	self.requestBuffer = [];

	// request methods
	self.GET = 0x00;
	self.PUT = 0x01;
	self.POST = 0x02;
	self.DELETE = 0x03;
	// responses
	self.R200 = 0x04;	// OK
	self.R404 = 0x05;	// Service not found
	self.R405 = 0x06;	// Method not allowed
	self.R408 = 0x07;	// Timeout
	self.R500 = 0x08;	// Service error

	mesh.openEndpoint(AQUILASERVICES_ENDPOINT, function(packet)
		{
			var data = self.parsePacket(packet);
			// DEBUG
			//if(data) console.log("From ", data.srcAddr, ": ", new Buffer(data.data).toString("utf8"));

			if(data) self.emit("data", data);
		});

	self.on("data", function(data)
		{
			self.emit(data.name, data.srcAddr, data.method, data.data);
		});
};

Services.prototype.__proto__ = events.EventEmitter.prototype;

Services.prototype.parsePacket = function(packet)
{
	try
	{
		// Check if its a services packet
		if(packet.srcEndpoint !== AQUILASERVICES_ENDPOINT || packet.dstEndpoint !== AQUILASERVICES_ENDPOINT) return false;
		var data = {
			srcAddr: packet.srcAddr,
			destAddr: packet.dstAddr,
			version: packet.data[0],
			method: packet.data[1],
			nameSize: packet.data[2],
			dataSize: packet.data[3],
			name: packet.data.slice(4, 4 + packet.data[2]),
			data: packet.data.slice(4 + packet.data[2], 4+packet.data[2]+packet.data[3])
		};

		if(data.version !== AQUILASERVICES_VERSION) return false;

		return data;
	}
	catch(err)
	{
		console.log(err);
		return false;
	}
};

// callback must have: reqAddr, method, data
Services.prototype.add = function(name, callback)
{
	var self = this;
	self.on(name, callback);
};

// callback must have: err, srcAddr, status, data
Services.prototype.request = function(destAddr, method, name, callback, data)
{
	var self = this;

	// Check body length and fail if longer than expected
	if(name.length + data.length > AQUILASERVICES_MAXDATASIZE) return callback(new Error("Data length is too long") );
	// form packet struct
	var packet = Buffer.concat([new Buffer([AQUILASERVICES_VERSION, method, name.length, data.length]),
								new Buffer(name),
								new Buffer(data)]);

	self.requestBuffer.push({destAddr: destAddr, packet: packet, callback: callback});
	self.requestNow();

};

Services.prototype.requestNow = function()
{
	var self = this;

	if(self.requestBuffer.length <= 0) return;
	if(self.requestPending) return;
	self.requestPending = true;

	var request = self.requestBuffer.shift();

	var pkt = new Packet(0xFF, 0xFF, mesh.getShortAddr(), request.destAddr,
						 AQUILASERVICES_ENDPOINT, AQUILASERVICES_ENDPOINT, request.packet.length,
						 request.packet);

	mesh.sendPacket(pkt, function(err)
						{
							if(err)
							{
								self.requestPending = false;
								if(self.requestBuffer.length > 0) self.requestNow();
								return request.callback(err);
							}

							var tout = null;

							var responseCb = function(packet)
								{
									if(tout)
									{
										// If its from the expected address
										//console.log("Got packet:", packet);
										if(packet.srcAddr === request.destAddr)
										{
											self.requestPending = false;
											clearTimeout(tout);
											// remove listener for only calling this once
											self.removeListener("data", responseCb);
											request.callback(null, packet.srcAddr, packet.method, new Buffer(packet.data).toString("utf8"));
											if(self.requestBuffer.length > 0) self.requestNow();
										}
									}
								};

							tout = setTimeout(function()
								{
									self.requestPending = false;
									tout = null;
									// Remove callback from event
									self.removeListener("data", responseCb);
									request.callback(new Error("Timeout") );
									if(self.requestBuffer.length > 0) self.requestNow();
								}, AQUILASERVICES_TIMEOUT);

							self.on("data", responseCb);
						});
};

Services.prototype.response = function(destAddr, status, data, callback)
{
	var self = this;
	// Check body length and fail if longer than expected
	if(data.length > AQUILASERVICES_MAXDATASIZE) return new Error("Data length is too long");
	// form packet struct
	var packet = Buffer.concat([new Buffer([AQUILASERVICES_VERSION, status, 0, data.length]),
															new Buffer(data)]);

	var pkt = new Packet(0xFF, 0xFF, mesh.getShortAddr(), destAddr,
												AQUILASERVICES_ENDPOINT, AQUILASERVICES_ENDPOINT, packet.length,
												packet);

	mesh.sendPacket(pkt, callback);
};


var services = new Services();
module.exports = services;
