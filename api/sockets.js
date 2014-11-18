// api/sockets.js

var socketioJwt = require("socketio-jwt");
var tokenConfig = require("./../config/token");

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
			deviceManager.setActiveRefresh(true);

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
				if(connectionCounter === 0) deviceManager.setActiveRefresh(false);
			});

		});

	var wserial = require("./lib/wserial");

	io.of("/wserial").on("connection", function(socket)
		{
			wserial.on("data", function(data)
				{
					socket.emit("data", data);
				});
		});
}