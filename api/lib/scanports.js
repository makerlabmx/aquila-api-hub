var Serial = require("serialport");
var SerialPort = Serial.SerialPort;
var async = require("async");
var buffertools = require("buffertools");
var os = require("os");

var TIMEOUT = 1200;

var scanPorts = function(baudrate, callback)
{
	console.log("Searching for bridge...");

	var expectedMessage = new Buffer([0xAA, 0x55, 0xAA, 0x55, 0x04]);
	var ping = new Buffer([0xAA, 0x55, 0xAA, 0x55, 0x07]);

	Serial.list(function (err, ports)
	{

		var foundPort = "";

		async.forEachSeries(ports, function(port, cb)
			{
				// Avoid Bluetooth tty ports as workaround for OSX kernel panics:
				if(port.comName.indexOf("Bluetooth") !== -1) return cb();

				console.log("  *Trying:", port.comName);

				var p = new SerialPort(port.comName,
					{
						baudrate: baudrate
					}, true, function(err)
					{
						if(err) { /*console.log(err);*/ return cb(); }

						var timeout = setTimeout(function()
							{
								p.drain(function(err)
									{
										if(err) return cb(err);
										p.close(function(){ cb(); });
									});
							}, TIMEOUT);

						p.on("data", function(data)
							{
								// only compare first 5 bytes, same lenght as expectedMessage
								if(buffertools.compare(data.slice(0, 5), expectedMessage) === 0)
								{
									clearTimeout(timeout);
									console.log("Found bridge in ", port.comName);

									p.flush(function(err)
									{
										p.drain(function(err)
										{
											p.close(function(err)
											{
												foundPort = p.path;
												cb("found");
											});
										});
									});
								}
							});

							// Wait if already sending then send ping
							p.drain(function()
								{
									p.write(ping);
								});

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
