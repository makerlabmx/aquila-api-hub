"use strict";
// transport.js

/*
	Manages transport connections
	Transports are connected via TLS socket
	they should automatically reconnect on failure
	and retry every 10 seconds

	They authenticate via token
*/

// For sockets with TLS and easy api
var nssocket = require("nssocket");
var fs = require("fs");
var configManager = require("../../configManager");


var PORT = 9600;

var TransportController = function()
{
	var self = this;

	self.sockets = [];

	var login = function(socket)
	{
		self.sockets.push(socket);
		socket.send("login", { message: "Login OK" });
		socket.on("close", function()
		{
			// Remove from sockets
			console.log("socket closed");
			var index = self.sockets.indexOf(socket);
			self.sockets.splice(index, 1);
		});
		// TODO subscribe protocol events
	};

	var key = fs.readFileSync(configManager.rsaKeyPath);
	var cert = fs.readFileSync(configManager.sslCertPath);
	// TODO use tls
	self.server = nssocket.createServer({ type: "tcp4"/*, key: key, cert: cert*/ }, function(socket)
	{
		//console.log(socket);
		socket.data("auth", function(data)
			{
				// TODO auth
				if(data.token)
				{
					console.log(data.token);
					login(socket);
				}
				else
				{
					socket.send("error", { message: "Invalid Token" });
					socket.destroy();
				}
			});
	});

	self.server.listen(PORT);
};

var transportController = new TransportController();

module.exports = transportController;