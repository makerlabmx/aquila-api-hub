"use strict";

// api/sockets.js

var socketioJwt = require("socketio-jwt");
var configManager = require("./../configManager");
var tokenConfig = require(configManager.tokenPath);
var deviceManager = require("./controllers/deviceManager");

module.exports = function(io, passport, deviceManager)
{
	var connectionCounter = 0;
	// jwt token authorization
	io.use(socketioJwt.authorize({
		secret: tokenConfig.secret,
		handshake: true
	}));

	io.sockets.on("connection", function(socket)
		{
			connectionCounter++;
			//console.log(">>>>>>>Connections: ", connectionCounter);

			// When someone connects, discover devices again.
			deviceManager.discover();
			//deviceManager.setActiveRefresh(true);

			deviceManager.on("deviceDiscovered", function()
			{
				socket.emit("deviceDiscovered");
			});

			deviceManager.on("deviceAdded", function()
			{
				socket.emit("deviceAdded");
			});

			deviceManager.on("deviceRemoved", function()
			{
				socket.emit("deviceRemoved");
			});

			deviceManager.on("event", function(device, eventN, param)
			{
				socket.emit("event", device, eventN, param);
			});

			socket.on("disconnect", function(socket)
			{
				connectionCounter--;
				//console.log(">>>>>>>Connections: ", connectionCounter);
				//if(connectionCounter === 0) deviceManager.setActiveRefresh(false);
			});

		});

	io.of("/wserial").on("connection", function(socket)
		{
			deviceManager.on("wserialData", function(err, data)
				{
					var pkt = { dstAddr: data.device, data: data.data };
					socket.emit("data", pkt);
				});

			socket.on("data", function(data)
				{
					if(data.dstAddr === undefined || data.data === undefined) socket.emit("err", "Missing dstAddr or data");
					else deviceManager.sendWSerial(data.dstAddr, data.data);
				});
		});
};
