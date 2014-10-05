// api/sockets.js

var socketioJwt = require("socketio-jwt");
var tokenConfig = require("./../config/token");

module.exports = function(io, passport, deviceManager)
{
	// jwt token authorization
	io.use(socketioJwt.authorize({
		secret: tokenConfig.secret,
		handshake: true
	}));

	io.sockets.on("connection", function(socket)
		{
			console.log(socket.handshake.decoded_token.user, 'connected');

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

		});
}