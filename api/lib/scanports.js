"use strict";

var SerialTransport = require("./serialTransport");
var Serial = require("serialport");
var SerialPort = Serial.SerialPort;
var async = require("async");
var os = require("os");

var TIMEOUT = 1200;

var scanPorts = function(baudrate, callback)
{
	console.log("Searching for bridge...");

	var CMD_START = 0x07;
	var CMD_PING = 0x08;

	Serial.list(function (err, ports)
	{

		var foundPort = "";

		async.forEachSeries(ports, function(port, cb)
			{
				// Avoid Bluetooth tty ports as workaround for OSX kernel panics:
				if(port.comName.indexOf("Bluetooth") !== -1) return cb();

				console.log("  *Trying:", port.comName);

				var transport = new SerialTransport(baudrate, port.comName);

				transport.on("error", function(err)
					{
						// Do nothing, we don't want to stop if we encounter an ocupied port
						transport.close(function(){ cb(); });
					});

				transport.on("ready", function()
					{
						var timeout = setTimeout(function()
							{
								transport.close(function(){ cb(); });
							}, TIMEOUT);

						transport.on("data", function(data)
							{
								if(data[0] === CMD_START)
								{
									clearTimeout(timeout);
									console.log("Found bridge in ", port.comName);
									transport.close(function(err)
										{
											transport = null;
											if(err) return cb(err);
											foundPort = port.comName;
											setTimeout(function(){cb("found");}, 1000);
											
										});
								}
							});

						transport.write(new Buffer([CMD_PING]));
					});

			}, function(err)
			{
				if(err === "found") return callback(foundPort);
				else if(err) { console.log("Error searching for Bridge:", err); process.exit(); }
				else { console.log("Couldn't find any Bridge."); process.exit(); }
			});

	});
};


module.exports = scanPorts;
