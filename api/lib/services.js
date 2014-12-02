// services.js
/*
	Javascript implementation of Aquila Services
*/

var mesh = require("./mesh");
var events = require("events");

var AQUILASERVICES_ENDPOINT = 12;
var AQUILASERVICES_VERSION = 1;

var AQUILASERVICES_MAXNAMESIZE = 16;
var AQUILASERVICES_MAXDATASIZE = mesh.AQUILAMESH_MAXPAYLOAD - 4;

var AQUILASERVICES_TIMEOUT = 1000;

var Services = function()
{
	var self = this;

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

	self.mesh = mesh;

	self.mesh.bridge.serialPort.on("data", function(packet)
		{
			var data = self.parsePacket(packet);
			if(data) console.log("From ", data.srcAddr, ": ", Buffer(data.data).toString("utf8"));
			if(data) self.emit("data", data);
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
			name: packet.data.slice(4, 4 + nameSize),
			data: packet.data.slice(4 + nameSize, 4+nameSize+dataSize)
		};

		return data;
	}
	catch(err)
	{
		return false;
	}
};

// TODO: implement
// callback must have: reqAddr, method, data
Services.prototype.add = function(name, callback)
{

};

// callback must have: err, srcAddr, status, data
Services.prototype.request = function(destAddr, method, name, callback, data)
{
	var self = this;

	// Check body length and fail if longer than expected
	if(name.length + data.length > AQUILASERVICES_MAXDATASIZE) return callback(new Error("Data length is too long") );
	// form packet struct
	var packet = Buffer.concat([Buffer([AQUILASERVICES_VERSION, method, name.length, data.length]), 
								Buffer(name), 
								Buffer(data)]);

	// DEBUG
	console.log(packet);

	self.mesh.bridge.sendData(self.mesh.localAddr, destAddr, 
						 AQUILASERVICES_ENDPOINT, AQUILASERVICES_ENDPOINT, 
						 packet);

	var tout = null;

	var responseCb = function(packet)
		{
			if(tout)
			{
				// If its from the expected address
				console.log("Got packet:", packet);
				if(packet.srcAddr === destAddr)
				{
					clearTimeout(tout);
					// remove listener for only calling this once
					self.removeListener("data", responseCb);
					callback(null, packet.srcAddr, packet.status, packet.data);
				}	
			}
		};

	tout = setTimeout(function()
		{
			tout = null;
			// Remove callback from event
			self.removeListener("data", responseCb);
			callback(new Error("Timeout") );
		}, AQUILASERVICES_TIMEOUT);

	self.on("data", responseCb);
};

// TODO: implement
Services.prototype.response = function(destAddr, method, data)
{

};


var services = new Services();
module.exports = services;