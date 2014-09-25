var Serial = require("serialport");
var SerialPort = Serial.SerialPort;
var async = require("async");
var buffertools = require("buffertools"); 

var scanPorts = function(baudrate, callback)
{
	console.log("Searching for bridge...");

	var expectedMessage = new Buffer([0xAA, 0x55, 0xAA, 0x55, 0x04]);
	var ping = new Buffer([0xAA, 0x55, 0xAA, 0x55, 0x07]);

	Serial.list(function (err, ports) 
	{
		ports.forEach(function(port) 
		{
			// console.log(port.comName);
			try
			{
				var p = new SerialPort(port.comName, 
				{
					baudrate: baudrate
				}, true, function(err)
				{
					if(err) return console.log(err);
					var timeout = setTimeout(function()
					 	{
					 		try
					 		{
					 			p.close();
					 		}
					 		catch(err){}
					 		
						}, 2000);
					p.on("data", function(data) 
						{
							// console.log(data);
							// only compare first 5 bytes, same lenght as expectedMessage
							if(buffertools.compare(data.slice(0, 5), expectedMessage) === 0)
							{
								clearTimeout(timeout);
								console.log("Found bridge in ", port.comName);
								if(callback)
								{
									p.flush(function(err) 
										{
							            	setTimeout(function()
							            	{
							                	p.close(function(err)
							                	{
							                		callback(p.path);
							                	});
							            	}, 10);
							        });
								}
							}
						});
					try
					{
						// Wait if already sending then send
						p.drain(function()
						{
							p.write(ping);
						});
					}
					catch(err){}
				});
			}
			catch(err){}
			
  		});
	});
};


module.exports = scanPorts;
