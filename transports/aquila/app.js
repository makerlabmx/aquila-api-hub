"use strict";

var nssocket = require("nssocket");

var PORT = 9600;

// TODO use tls

var socket = new nssocket.NsSocket(
	{
		reconnect: true,
		type: "tcp4"
	});

var interval = null;

socket.on("start", function()
	{
		if(interval) clearInterval(interval);

		socket.send("auth", 
		{
			token: "asdfhjkskasdkfasd"
		});

		socket.data("error", function(data)
			{
				console.log(data.message);
			});
		socket.data("login", function(data)
			{
				console.log(data.message);
			});
	});

socket.on("error", function(error)
	{
		console.log(error);
	});

interval = setInterval(function()
{
	console.log("Trying to connect");
	socket.connect(PORT, "127.0.0.1");

}, 5000);

