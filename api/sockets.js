// api/sockets.js

module.exports = function(io, deviceManager)
{
	io.sockets.on("connection", function(socket)
		{
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