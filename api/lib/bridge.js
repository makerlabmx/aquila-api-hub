/*
 *	802.15.4 Dongle interface utility.
 *	Transfers 802.15.4 LWM packet frames to and from a USB Dongle via a serial port bridge.
 *
 *	Author: Rodrigo Méndez Gamboa, rmendez@makerlab.mx
 *
 *	Serial Bridge Protocol: [PREAMBLE] COMMAND [Command specific]
 *		[PREAMBLE]: 0xAA 0x55 0xAA 0x55
 *
 *	Comands:
 *		CMD_DATA: 			[Command specific] = lqi rssi srcAddr(16) dstAddr(16) srcEndpoint dstEndpoint frameSize [MAC Frame]
 *		CMD_SET_PROM:		[Command specific] = PROM*				*0 or 1
 *		CMD_SET_PAN:		[Command specific] = [PAN*]				*len = 2 (16 bit), lsb first
 *		CMD_SET_CHAN:		[Command specific] = CHAN*				*11 - 24
 *		CMD_START																					*Sent on bridge start or reset and in response to CMD_PING
 *		CMD_SET_SHORT_ADDR:	[Command specific] = [ADDR*]	*len = 2 (16 bit), lsb first
 *		//CMD_SET_LONG_ADDR:	[Command specific] = [ADDR*]*len = 8 (64 bit), lsb first
 *		CMD_PING:																					*Sent by PC, response is CMD_START
 *		CMD_SUCESS:																				*Sent on data transmit success
 *		CMD_ERROR:																				*Sent on data tranmit error
 *		CMD_GET_LONG_ADDR:																*Get bridge MAC address
 *		CMD_GET_SECURITY:																	*Get if security enabled
 *		CMD_SET_SECURITY: [Command specific] = ENABLED*		*0 or 1
 *		CMD_SET_KEY:			[Command specific] = [SEC_KEY*]	*len = 16 (128 bit), automatically enables security and responds with security enabled
 */

 /*
	New Data Format 10/11/14: Now we are using LWM, thus all MAC processing is done in the uC, we only send relevant data to PC.
		lqi rssi srcAddr(16) dstAddr(16) srcEndpoint dstEndpoint frameSize [LWM Data]
 */

/*
 *	Communication Secuence Diagrams:
 *
 *	PC 	| CMD_PING	------> | Bridge
 *		| <------ CMD_START	|
 *		|					|
 *
 *	PC 	| CMD_DATA	------------------> | Bridge
 *		| <-- CMD_SUCCESS or CMD_ERROR	|
 *		|								|
 *
 *	PC 	| CMD_SET_*	------------------> | Bridge
 *		| <--- CMD_SET_* (Confirmation)	|
 *		|								|
 *
 *	On Data reception:
 * 	PC 	| <------ CMD_DATA 	| Bridge
 *		|					|
 *
 *	On Bridge Startup:
 *	PC 	| <------ CMD_START	| Bridge
 *		|					|
 *
 */

var Serial = require("serialport");
var SerialPort = Serial.SerialPort;
require("buffertools").extend(); // extend Buffer.prototype
var scanPorts = require("./scanports");
var events = require("events");
var config = require("./../../config/bridge");
var Packet = require("./meshPacket.js");

// Serial timeout, used for clearing buffer if no char received in that time.
var TIMEOUT = 1000;

// Bridge Protocol Constants:
var PREAMBLE 						= new Buffer([0xAA, 0x55, 0xAA, 0x55]);
var CMD_DATA 						= 0x00;
var CMD_SET_PROM 				= 0x01;
var CMD_SET_PAN 				= 0x02;
var CMD_SET_CHAN 				= 0x03;
var CMD_START 					= 0x04;
var CMD_SET_SHORT_ADDR 	= 0x05;
var CMD_SET_LONG_ADDR 	= 0x06;
var CMD_PING 						= 0x07;
var CMD_SUCCESS 				= 0x08;
var CMD_ERROR 					= 0x09;
var CMD_GET_LONG_ADDR 	= 0x0A;
var CMD_GET_SECURITY 		= 0x0B;
var CMD_SET_SECURITY 		= 0x0C;
var CMD_SET_KEY 				= 0x0D;

var INDEX_CMD 				= PREAMBLE.length;
var INDEX_LQI 				= PREAMBLE.length + 1;
var INDEX_RSSI 				= PREAMBLE.length + 2;
var INDEX_SRCADDRLOW 	= PREAMBLE.length + 3;
var INDEX_SRCADDRHI 	= PREAMBLE.length + 4;
var INDEX_DSTADDRLOW 	= PREAMBLE.length + 5;
var INDEX_DSTADDRHI 	= PREAMBLE.length + 6;
var INDEX_SRCEND 			= PREAMBLE.length + 7;
var INDEX_DSTEND 			= PREAMBLE.length + 8;
var INDEX_SIZE 				= PREAMBLE.length + 9;

var bridgeParser = function()
{
	var data = new Buffer(0);
	var timeoutFnc = null;
	return function(emmiter, buffer)
	{

		if(timeoutFnc) clearTimeout(timeoutFnc);
		timeoutFnc = setTimeout(function(){
			data = new Buffer(0);
		}, TIMEOUT);

		data = data.concat(buffer);

		var start = data.indexOf(PREAMBLE);
		while(start !== -1)
		{
			// Get rid of garbage data
			data = data.slice(start);

			// For checking wich command
			if(data.length < PREAMBLE.length + 1) return;

			switch(data[INDEX_CMD])
			{
				case CMD_DATA:
					// Checking if we have lqi, rssi, size, etc. already
					if(data.length < PREAMBLE.length + 10) return;
					var lqi =  data[INDEX_LQI];
					var rssi = data[INDEX_RSSI];
					var srcAddr = data[INDEX_SRCADDRLOW];
					srcAddr |= (data[INDEX_SRCADDRHI] << 8);
					var dstAddr = data[INDEX_DSTADDRLOW];
					dstAddr |= (data[INDEX_DSTADDRHI] << 8);
					var srcEndpoint = data[INDEX_SRCEND];
					var dstEndpoint = data[INDEX_DSTEND];
					var size = data[INDEX_SIZE];

					// Checking if we have the whole message:
					if(data.length < PREAMBLE.length + 10 + size) return;
					var frame = data.slice(INDEX_SIZE + 1);
					var frameArray = [];

					for(var i = 0; i < size; i++)
					{
						frameArray.push(frame[i]);
					}

					//Cleaning data:
					data = data.slice(INDEX_SIZE + size + 1);
					try
					{
						emmiter.emit("data", new Packet(lqi, rssi, srcAddr, dstAddr, srcEndpoint, dstEndpoint, size, frameArray));
					}
					catch(err){}

					break;

				case CMD_START:
					data = data.slice(INDEX_CMD);
					try
					{
						emmiter.emit("bridgeStarted");
					}
					catch(err){}
					break;

				case CMD_SUCCESS:
					data = data.slice(INDEX_CMD);
					try
					{
						emmiter.emit("success");
					}
					catch(err){}
					break;

				case CMD_ERROR:
					data = data.slice(INDEX_CMD);
					try
					{
						emmiter.emit("error");
					}
					catch(err){}
					break;

				case CMD_SET_PROM:
					if(data.length < PREAMBLE.length + 2) return;
					var prom = data[INDEX_CMD + 1];
					prom = prom!==0?true:false;
					data = data.slice(INDEX_CMD + 1);
					try
					{
						emmiter.emit("promSetConfirm", prom);
					}
					catch(err){}
					break;

				case CMD_SET_PAN:
					if(data.length < PREAMBLE.length + 3) return;
					var low = data[INDEX_CMD + 1];
					var high = data[INDEX_CMD + 2];
					var pan = low | (high << 8);
					data = data.slice(INDEX_CMD + 2);
					try
					{
						emmiter.emit("panSetConfirm", pan);
					}
					catch(err){}
					break;

				case CMD_SET_CHAN:
					if(data.length < PREAMBLE.length + 2) return;
					var chan = data[INDEX_CMD + 1];
					data = data.slice(INDEX_CMD + 1);
					try
					{
						emmiter.emit("chanSetConfirm", chan);
					}
					catch(err){}
					break;

				case CMD_SET_SHORT_ADDR:
					if(data.length < PREAMBLE.length + 3) return;
					var low = data[INDEX_CMD + 1];
					var high = data[INDEX_CMD + 2];
					var addr = low | (high << 8);
					data = data.slice(INDEX_CMD + 2);
					try
					{
						emmiter.emit("shortAddrSetConfirm", addr);
					}
					catch(err){}
					break;

				case CMD_SET_LONG_ADDR:
					if(data.length < PREAMBLE.length + 9) return;
					var addr = [];
					for(var i = 1; i < 9; i++)
					{
						addr.push(data[INDEX_CMD + i]);
					}
					data = data.slice(INDEX_CMD + 8);
					try
					{
						emmiter.emit("longAddrSetConfirm", addr);
					}
					catch(err){}
					break;

				case CMD_GET_SECURITY:
					if(data.length < PREAMBLE.length + 2) return;
					var secEn = data[INDEX_CMD + 1];
					secEn = secEn!==0?true:false;
					data = data.slice(INDEX_CMD + 1);
					try
					{
						emmiter.emit("securityConfirm", secEn);
					}
					catch(err){}
					break;

				default:
					data = data.slice(INDEX_CMD);
					break;
			}
			start = data.indexOf(PREAMBLE);
		}

	};
};

var Bridge = function(baudrate, port)
{
	var self = this;

	self.fake = config.fake;
	if(self.fake) return self.emit("ready");

	if(baudrate === undefined) var baudrate = config.baudrate;
	if(port === undefined) var port = config.port;

	var init = function(path)
		{
			self.serialPort = new SerialPort(path,
			{
				baudrate: baudrate,
				parser: bridgeParser()
			});

			self.serialPort.on("open", function()
			{
				if(config.debug)
				{
					console.log("Bridge port open");
					// data returned as LWM frame array

					self.serialPort.on("data", function(data)
						{
							console.log("data received: ", Buffer(data.data).toString());
						});

					self.serialPort.on("bridgeStarted", function()
						{
							console.log("Bridge Started");
						});
					self.serialPort.on("success", function()
						{
							console.log("Data Transmit Success");
						});
					self.serialPort.on("error", function()
						{
							console.log("Data Transmit Error");
						});
					self.serialPort.on("promSetConfirm", function(isProm)
						{
							console.log("Prom Confirm: ", isProm);
						});
					self.serialPort.on("panSetConfirm", function(pan)
						{
							console.log("Pan Confirm: ", pan);
						});
					self.serialPort.on("chanSetConfirm", function(chan)
						{
							console.log("Channel Confirm: ", chan);
						});
					self.serialPort.on("shortAddrSetConfirm", function(addr)
						{
							console.log("Short Address Confirm: ", addr);
						});
					self.serialPort.on("longAddrSetConfirm", function(addr)
						{
							console.log("Long Address Confirm: ", addr);
						});
				}

				self.emit("ready");
			});
		};

	if(port) init(port);
	else scanPorts(baudrate, init);
};

Bridge.prototype.__proto__ = events.EventEmitter.prototype;

Bridge.prototype.ping = function()
{
	var frame = Buffer.concat([PREAMBLE, new Buffer([CMD_PING])]);
	this.write(frame);
};

// isProm format: bool
Bridge.prototype.setPromiscuous = function(isProm)
{
	var param = null;
	if(isProm === true) param = 0x01;
	else if(isProm === false) param = 0x00;

	if(param)
	{
		var frame = Buffer.concat([PREAMBLE, new Buffer([CMD_SET_PROM, param])]);
		this.write(frame);
	}
};

// pan format: 16 bit number, example: 0xCA5A
Bridge.prototype.setPan = function(pan)
{
	if(pan)
	{
		var low = pan & 0xFF;
		var high = (pan >>> 8) & 0xFF;
		var frame = Buffer.concat([PREAMBLE, new Buffer([CMD_SET_PAN, low, high])]);
		this.write(frame);
	}
};

// chan format: number from 11 to 26
Bridge.prototype.setChannel = function(chan)
{
	if(chan >= 11 && chan <= 26)
	{
		var frame = Buffer.concat([PREAMBLE, new Buffer([CMD_SET_CHAN ,chan])]);
		this.write(frame);
	}
};

// address format: 16 bit number, example: 0xFA2B
Bridge.prototype.setShortAddress = function(shortAddr)
{
	if(shortAddr)
	{
		var low = shortAddr & 0xFF;
		var high = (shortAddr >>> 8) & 0xFF;
		var frame = Buffer.concat([PREAMBLE, new Buffer([CMD_SET_SHORT_ADDR, low, high]) ]);
		this.write(frame);
	}
};

// address format: 8 byte array (64 bit address), lsb first.
Bridge.prototype.setLongAddress = function(longAddr)
{
	if(longAddr.length === 8)
	{
		var cmd = [CMD_SET_LONG_ADDR];
		cmd = cmd.concat(longAddr);
		var frame = Buffer.concat( [PREAMBLE, new Buffer(cmd) ] );
		this.write(frame);
	}
};

Bridge.prototype.getLongAddress = function()
{
	var cmd = [CMD_GET_LONG_ADDR];
	var frame = Buffer.concat( [PREAMBLE, new Buffer(cmd) ] );
	this.write(frame);
};

Bridge.prototype.setSecurityEnabled = function(enabled)
{
	var param = null;
	if(enabled === true) param = 0x01;
	else if(enabled === false) param = 0x00;

	if(param)
		{
			var frame = Buffer.concat([PREAMBLE, new Buffer([CMD_SET_SECURITY, param])]);
			this.write(frame);
		}
};


// key must be 16 byte array
Bridge.prototype.setSecurityKey = function(key)
{
	if(key.length === 16)
	{
		var frame = Buffer.concat([PREAMBLE, new Buffer([CMD_SET_KEY]), new Buffer(key)]);
		this.write(frame);
	}
};

// data format: array (or buffer?)
Bridge.prototype.sendData = function(srcAddr, dstAddr, srcEndpoint, dstEndpoint, data)
{
	if(!data) return;
	// Dummy lqi and rssi (bridge doesnt care about this on transmit, just for completness):
	var lqi = 0xFF;
	var rssi = 0xFF;

	var frame = Buffer.concat([ PREAMBLE, new Buffer([ CMD_DATA, lqi, rssi, srcAddr&0xFF, (srcAddr>>8)&0xFF,
								dstAddr&0xFF, (dstAddr>>8)&0xFF, srcEndpoint, dstEndpoint, data.length ]), data ]);

	this.write(frame);

};

// If still sending, wait and then send
Bridge.prototype.write = function(data)
{
	var self = this;
	// do nothing if we are in fake mode
	if(self.fake) return;
	self.serialPort.drain(function()
		{
			self.serialPort.write(data);
		});
};

module.exports = Bridge;
