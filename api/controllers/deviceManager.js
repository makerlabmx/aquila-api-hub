// api/controllers/deviceManager.js

var mongoose = require("mongoose");
var Device = mongoose.model("Device");
var Action = mongoose.model("Action");
var Event = mongoose.model("Event");
var Interaction = mongoose.model("Interaction");

var Protocol = require("./../lib/protocol");
var addressParser = require("./../lib/addressParser");
var events = require("events");
var async = require("async");
var buffertools = require("buffertools");

var staticConfig = require("./../../config/deviceManager.js");

//Command definitions:

var NACK = 0;
var ACK = 1;
var ACTION = 2;
var GET = 3;
var POST = 4;
var CUSTOM = 5;

var COM_NACTIONS = 0;
var COM_NEVENTS = 1;
var COM_CLASS = 2;
var COM_SIZE = 3;
var COM_NENTRIES = 4;
var COM_ABSENTRY = 5;
var COM_ENTRY = 6;
var COM_CLEAR = 7;
var COM_ADDENTRY = 8;
var COM_DELABSENTRY = 9;
var COM_DELENTRY = 10;
var COM_ACTION = 11;
var COM_EVENT = 12;
var COM_NAME = 13;
var COM_EUI = 14;

var BROADCAST = 0xFFFF;

/*
	DeviceManager:
		- Obtains all the info of the devices in the Aquila network.
		- Manages the subnetwork (PAN)
		- Sends messages to devices
		- Receives events from devices
	Queues:
		fetchQueue: fetches devices and interactions of each, one at a time
		refreshInteractionsQueue: deletes and refetches all interactions of one device
		pingQueue: Pings every device one at a time, if it doesn't get response, marks it as not active and deletes its interactions.

	Responds to events:
		Protocol post with COM_CLASS, calls device fetcher.
		Protocol event, emits event with device, eventN and param (null if there isn't param).
		Calls ping every staticConfig.refreshInterval ms if staticConfig.autoCheckAlive

	Emits events:
		deviceDiscovered	(when a device is firts known, but hasn't been fetched)
		deviceAdded			(when a device is fully fetched or made active)
		deviceRemoved		(when a device fails Ping and is marked inactive)
		event(device, eventN, param) (when a device emits an event)
*/

var verboseDebug = function(deviceManager)
{
	deviceManager.on("deviceDiscovered", function()
	{
		console.log("Device discovered");
	});
	deviceManager.on("deviceAdded", function()
	{
		console.log("Device added");
	});
	deviceManager.on("deviceRemoved", function()
	{
		console.log("Device removed");
	});
	deviceManager.on("event", function(device, eventN, param)
	{
		console.log("					EVENT: ", eventN, " From Device: ", device.class, " With param: ", param);
	});

	deviceManager.protocol.on("post", function(packet)
		{
			console.log("POST packet: ", packet);
		});

	deviceManager.protocol.on("event", function(packet)
		{
			console.log("EVENT packet: ", packet);
		});
};

var DeviceManager = function()
{
	var self = this;
	this.protocol = new Protocol();

	this.fetchQueue = async.queue(function(device, callback)
		{
			//console.log("Open");
			// Update device to check if not already fetched
			Device.findById(device._id, function(err, device)
				{
					var alreadyFetched = false;
					if(device) alreadyFetched = device._fetchComplete;
					if(err || alreadyFetched || !device) return callback();
					self.fetchAll(device, function(err)
						{
							if(err) console.log(err);
							else self.emit("deviceAdded");
							//console.log("Close");
							callback();
						});
				});
			
		}, 1);

	this.refreshInteractionsQueue = async.queue(function(device, callback)
		{
			self.fetchInteractions(device, function(err)
						{
							if(err) console.log(err);
							callback();
						});
		}, 1);

	this.pingQueue = async.queue(function(device, cb)
		{
			if(staticConfig.debug) console.log("Pinging ", device.class);
			async.retry(3, function(callback){ self.ping(device, callback); }, function(err)
				{
					if(err)
					{
						console.log("Ping err: ", err.message);
						// Device didn't respond, mark as inactive
						device.active = false;
						device.save(function(err, device)
							{
								if(err) return console.log(err.message);
								// Remove all interactions from this device:
								Interaction.remove({"action_address": device.address}, function(err)
								{
									if(err) return console.log("Error deleting all interactions from ", device.address, err);
									self.emit("deviceRemoved");
								});
							});
					}
					cb();
				} );
		}, 1);

	this.protocol.on("ready", function()
		{
			if(staticConfig.debug) console.log("Starting bridge...");

			// Device adding manager
			self.protocol.on("post", self.deviceFetcher.bind(self));

			// Device Event handling:
			self.protocol.on("event", self.eventHandler.bind(self));

			// Housekeeping, check incomplete devices, check if still alive
			setInterval(self.refreshActiveDevices.bind(self), staticConfig.refreshInterval);

			if(staticConfig.debug) verboseDebug(self);

			self.emit("ready");
		});
};

DeviceManager.prototype.__proto__ = events.EventEmitter.prototype;

DeviceManager.prototype.refreshActiveDevices = function()
{
	var self = this;
	if(staticConfig.debug) console.log("Refreshing Active Devices... ");
	Device.find(function(err, devices)
	{
		if(err) return console.log(err);

		for(var i = 0; i < devices.length; i++)
		{
			if(!devices[i]._fetchComplete) self.fetchQueue.push(devices[i]);
			// Check if its alive
			else if(devices[i].active && staticConfig.autoCheckAlive)
			{
				self.pingQueue.push(devices[i]);
			}
		}
	});
};

DeviceManager.prototype.eventHandler = function(packet)
{
	var self = this;
	var emitterAddress = packet.srcAddr;
	var eventN = packet.message.command[0];
	var hasParam = packet.message.control.hasParam;
	var param = null;
	if(hasParam) param = packet.message.param[0];

	var EUIAddr = packet.message.data;

	var query = Device.where({ address: EUIAddr });
	query.findOne(function(err, device)
		{
			if(err) return console.log(err.message);
			if(device) self.emit("event", device, eventN, param);
		});	
};

DeviceManager.prototype.deviceFetcher = function(packet)
{
	var self = this;
	// If we get an EUI message (device anouncing itself)
	if(packet.message.command[0] === COM_EUI)
	{
		var deviceAddress = packet.srcAddr;
		var deviceEUI = packet.message.data;

		var query = Device.where({ address: deviceEUI });
		query.findOne(function(err, device)
			{
				
				if(err) return console.log("Error", err);
				if(!device)
				{
					// Not aready addeed, add
					device = new Device(
						{
							address: deviceEUI,
							shortAddress: deviceAddress,
							class: null,
							name: null,
							_defaultName: null,
							active: false,
							actions: [],
							events: [],
							_fetchComplete: false,
							_nActions: null,
							_nEvents: null,
							_nInteractions: null,
							_maxInteractions: null
							//_interactions: []
						});
					device.save(function(err, device)
						{
							if(err) return console.log("Error", err);
							self.emit("deviceDiscovered");

							// fetch all
							self.fetchQueue.push(device);
						});
				}
				else
				{
					// if not active, make it active and refresh interactions
					if(!device.active && device._fetchComplete)
					{
						device.active = true;
						self.refreshInteractionsQueue.push(device, function()
							{
								device.save(function(err, device)
								{
									if(err) return console.log("Error", err);
									// Emit device added
									self.emit("deviceAdded");
								});
							});
					}
					if(!device._fetchComplete)
					{
						// retry fetch all
						self.fetchQueue.push(device);
					}
				}
			});
		
	}
};

DeviceManager.prototype.discover = function(callback)
{
	var self = this;
	self.protocol.requestGet(BROADCAST, COM_EUI);
	var count = 0;
	var interval = setInterval(function()
		{
			self.protocol.requestGet(BROADCAST, COM_EUI);
			count++;
			if(count > 3) 
			{
				clearInterval(interval);
				if(callback) callback();
			}

		}, 500);
};

DeviceManager.prototype.getPAN = function()
{
	var pan = this.protocol.getPAN();
	return pan;
};

DeviceManager.prototype.setPAN = function(pan)
{
	var self = this;
	if(typeof(pan) === "number")
	{
		this.protocol.setPAN(pan);
	}
};

DeviceManager.prototype.requestAction = function(address, action, param)
{
	if(typeof address === "string")
	{
		address = parseInt(address);
	}

	if(address)
	{
		this.protocol.requestAction(address, action, param);
	}
};

DeviceManager.prototype.requestGet = function(address, command, param, data, callback)
{
	var self = this;
	if(typeof address === "string")
	{
		address = parseInt(address);
	}
	if(!address) return callback(new Error("Invalid address"));
	this.protocol.requestGet(address, command, param, data);

	var timeout = null;

	var getCb = function(packet)
	{
		// Proceed only if timeout hasn't triggered
		if(timeout)
		{
			clearTimeout(timeout);
			callback(null, packet, getCb);
		}
	};

	timeout = setTimeout(function()
	{
		// Clear timeout, indicating that timeout has triggered
		timeout = null;
		// Remove callback from event
		self.protocol.removeListener(String(address), getCb);
		callback(new Error("Timeout"), null, getCb);
	}, staticConfig.timeout);


	// TODO: Check if its necesary to remove listener after success.
	this.protocol.on(String(address), getCb);
};

DeviceManager.prototype.requestPost = function(address, command, param, data, callback, timeout)
{
	var self = this;
	if(typeof timeout === "undefined") timeout = staticConfig.timeout;
	if(typeof address === "string")
	{
		address = parseInt(address);
	}
	if(!address) return callback(new Error("Invalid address"));
	this.protocol.requestPost(address, command, param, data);

	var tout = null;

	var postCb = function(packet)
	{
		if(tout)
		{
			clearTimeout(tout);
			callback(null, packet, postCb);
		}
	};

	tout = setTimeout(function()
	{
		tout = null;
		// Remove callback from event
		self.protocol.removeListener(String(address), postCb);
		callback(new Error("Timeout"), null, postCb);
	}, timeout);

	// TODO: Check if its necesary to remove listener after success.
	this.protocol.on(String(address), postCb);
};

DeviceManager.prototype.requestCustom = function(address, data, callback)
{
	var self = this;
	if(typeof address === "string")
	{
		address = parseInt(address);
	}
	if(!address) return callback(new Error("Invalid address"));
	this.protocol.requestCustom(address, data);

	var tout = null;

	var custCb = function(packet)
	{
		if(tout)
		{
			clearTimeout(tout);
			callback(null, packet, custCb);
		}
	};

	tout = setTimeout(function()
	{
		tout = null;
		// Remove callback from event
		self.protocol.removeListener(String(address), custCb);
		callback(new Error("Timeout"), null, custCb);
	}, staticConfig.timeout);

	// TODO: Check if its necesary to remove listener after success.
	this.protocol.on(String(address), custCb);
};


// Callback: function(err)
DeviceManager.prototype.ping = function(device, callback)
{
	var self = this;
	self.requestGet(device.shortAddress, COM_EUI, null, null, function(err, packet, getCb)
		{
			self.protocol.removeListener(String(device.shortAddress), getCb);
			if(err) return callback(err);
			return callback(null);
		});
};

DeviceManager.prototype.fetchAll = function(device, cb)
{
	//console.log("fetchAll");
	//console.log("				DEBUG: Fetching: ", device.class);
	async.series([
		async.retry(3, (function(callback){ this.fetchClass(device, callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchName(device, callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchNActions(device, callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchNEvents(device, callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchMaxInteractions(device, callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchActions(device, callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchEvents(device, callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchInteractions(device, callback); }).bind(this) )
		], 
		function(err, results)
		{
			if(err) return cb(err, results);
			device.active = true;
			device._fetchComplete = true;
			device.save(function(err)
			{
				if(err) console.log(err);
				cb(err, results);
			});
			
		});
};

DeviceManager.prototype.fetchClass = function(device, callback)
{
	//console.log("fetchName");
	var self = this;
	self.requestGet(device.shortAddress, COM_CLASS, null, null, (function(err, packet, getCb)
	{
		if(err) { self.protocol.removeListener(String(device.shortAddress), getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_CLASS)
		{
			self.protocol.removeListener(String(device.shortAddress), getCb);
			device.class = packet.message.data.toString("utf8");
			return callback(null);
		}
		//else callback(new Error("Unexpected message"));
		self.protocol.removeListener(String(device.shortAddress), getCb);
		callback(new Error("Unexpected message"));

	}));
};

DeviceManager.prototype.fetchName = function(device, callback)
{
	//console.log("fetchName");
	var self = this;
	self.requestGet(device.shortAddress, COM_NAME, null, null, (function(err, packet, getCb)
	{
		if(err) { self.protocol.removeListener(String(device.shortAddress), getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_NAME)
		{
			self.protocol.removeListener(String(device.shortAddress), getCb);
			device.name = packet.message.data.toString("utf8");
			device._defaultName = device.name;
			return callback(null);
		}
		//else callback(new Error("Unexpected message"));
		self.protocol.removeListener(String(device.shortAddress), getCb);
		callback(new Error("Unexpected message"));

	}));
};

DeviceManager.prototype.fetchNActions = function(device, callback)
{
	//console.log("fetchNActions");
	var self = this;
	self.requestGet(device.shortAddress, COM_NACTIONS, null, null, (function(err, packet, getCb)
	{
		if(err) { self.protocol.removeListener(String(device.shortAddress), getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_NACTIONS)
		{
			self.protocol.removeListener(String(device.shortAddress), getCb);
			device._nActions = packet.message.data[0];
			return callback(null);
		}
		//else callback(new Error("Unexpected message"));
		self.protocol.removeListener(String(device.shortAddress), getCb);
		callback(new Error("Unexpected message"));

	}));
};

DeviceManager.prototype.fetchNEvents = function(device, callback)
{
	//console.log("fetchNEvents");
	var self = this;
	self.requestGet(device.shortAddress, COM_NEVENTS, null, null, (function(err, packet, getCb)
	{
		if(err) { self.protocol.removeListener(String(device.shortAddress), getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_NEVENTS)
		{
			self.protocol.removeListener(String(device.shortAddress), getCb);
			device._nEvents = packet.message.data[0];
			return callback(null);
		}
		//else callback(new Error("Unexpected message"));
		self.protocol.removeListener(String(device.shortAddress), getCb);
		callback(new Error("Unexpected message"));

	}));
};

DeviceManager.prototype.fetchNInteractions = function(device, callback)
{
	//console.log("fetchNInteractions");
	var self = this;
	self.requestGet(device.shortAddress, COM_NENTRIES, null, null, (function(err, packet, getCb)
	{
		if(err) { self.protocol.removeListener(String(device.shortAddress), getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_NENTRIES)
		{
			self.protocol.removeListener(String(device.shortAddress), getCb);
			device._nInteractions = packet.message.data[0];
			return callback(null);
		}
		//else callback(new Error("Unexpected message"));
		self.protocol.removeListener(String(device.shortAddress), getCb);
		callback(new Error("Unexpected message"));

	}));
};

DeviceManager.prototype.fetchMaxInteractions = function(device, callback)
{
	var self = this;
	self.requestGet(device.shortAddress, COM_SIZE, null, null, (function(err, packet, getCb)
	{
		if(err) { self.protocol.removeListener(String(device.shortAddress), getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_SIZE)
		{
			self.protocol.removeListener(String(device.shortAddress), getCb);
			device._maxInteractions = packet.message.data[0];
			return callback(null);
		}
		//else callback(new Error("Unexpected message"));
		self.protocol.removeListener(String(device.shortAddress), getCb);
		callback(new Error("Unexpected message"));

	}));
};

DeviceManager.prototype.fetchAction = function(device, n, callback)
{
	//console.log("fetchAction ", n);
	var self = this;
	self.requestGet(device.shortAddress, COM_ACTION, n, null, (function(err, packet, getCb)
	{
		if(err) { self.protocol.removeListener(String(device.shortAddress), getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_ACTION)
		{
			self.protocol.removeListener(String(device.shortAddress), getCb);
			var newAction = new Action();
			newAction.n = packet.message.param[0];
			newAction.name = packet.message.data.toString("utf8");

			var alreadyAdded = false;
			for(var actn in device.actions)
			{
				if(device.actions[actn].n === newAction.n) alreadyAdded = true;
			}

			if(!alreadyAdded) device.actions.push(newAction);
			return callback(null);
		}
		//else callback(new Error("Unexpected message"));
		self.protocol.removeListener(String(device.shortAddress), getCb);
		callback(new Error("Unexpected message"));

	}));
};

DeviceManager.prototype.fetchActions = function(device, cb)
{
	//console.log("fetchActions");
	var self = this;
	var fcns = [];

	for(var i = 0; i < device._nActions; ++i)
	{
		(function()
		{
			var j = i;
			fcns.push(async.retry(3, (function(callback){ self.fetchAction(device, j, callback); })) );
		})();
	}

	async.series(fcns, function(err, results)
		{	
			// Sometimes we miss actions, retry if so.
			if(device.actions.length !== device._nActions) return cb(true);
			cb(err, results);
		});
};

DeviceManager.prototype.fetchEvent = function(device, n, callback)
{
	//console.log("fetchEvent ", n);
	var self = this;
	self.requestGet(device.shortAddress, COM_EVENT, n, null, (function(err, packet, getCb)
	{
		if(err) { self.protocol.removeListener(String(device.shortAddress), getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_EVENT)
		{
			self.protocol.removeListener(String(device.shortAddress), getCb);
			var newEvent = new Event();
			newEvent.n = packet.message.param[0];
			newEvent.name = packet.message.data.toString("utf8");

			var alreadyAdded = false;
			for(var evt in device.events)
			{
				if(device.events[evt].n === newEvent.n) alreadyAdded = true;
			}

			if(!alreadyAdded) device.events.push(newEvent);
			return callback(null);
		}
		//else callback(new Error("Unexpected message"));
		self.protocol.removeListener(String(device.shortAddress), getCb);
		callback(new Error("Unexpected message"));

	}));
};

DeviceManager.prototype.fetchEvents = function(device, cb)
{
	//console.log("fetchEvents");
	var self = this;
	var fcns = [];

	for(var i = 0; i < device._nEvents; ++i)
	{
		(function()
		{
			var j = i;
			fcns.push(async.retry(3, (function(callback){ self.fetchEvent(device, j, callback); })) );
		})();
	}

	async.series(fcns, function(err, results)
		{
			// Sometimes we miss events, retry if so.
			if(device.events.length !== device._nEvents) return cb(true);
			cb(err, results);
		});
};

DeviceManager.prototype.fetchInteraction = function(device, n, callback)
{
	// console.log("fetchInteraction ", n);
	var self = this;
	self.requestGet(device.shortAddress, COM_ENTRY, n, null, (function(err, packet, getCb)
	{
		if(err) { self.protocol.removeListener(String(device.shortAddress), getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_ENTRY)
		{
			self.protocol.removeListener(String(device.shortAddress), getCb);
			var newInteraction = new Interaction();

			newInteraction._n = packet.message.param[0];
			newInteraction.action_address = device.address;
			// parse Interaction
			newInteraction.fromBuffer(packet.message);

			var alreadyAdded = false;
			for(var entr = 0; entr < device._interactions.length; entr++)
			{
				if(device._interactions[entr]._n === newInteraction._n) alreadyAdded = true;
			}

			if(!alreadyAdded) device._interactions.push(newInteraction);
			return callback(null);
		}
		//else callback(new Error("Unexpected message"));
		self.protocol.removeListener(String(device.shortAddress), getCb);
		callback(new Error("Unexpected message"));

	}).bind(this));
};

DeviceManager.prototype.fetchInteractions = function(device, cb)
{
	// console.log("fetchInteractions", device._nInteractions);
	var self = this;
	// Fetch NInteractions first
	var fcns = [ async.retry(3, (function(callback){ this.fetchNInteractions(device, callback); }).bind(this) ) ];

	// For temporarily storing interactions, in the end we will save them in the interactions document.
	device._interactions = [];

	for(var i = 0; i < device._nInteractions; ++i)
	{
		(function()
		{
			var j = i;
			fcns.push(async.retry(3, (function(callback){ self.fetchInteraction(device, j, callback); })) );
		})();
	}

	async.series(fcns, function(err, results)
		{
			// Sometimes we miss interactions, retry if so.
			if(device._interactions.length !== device._nInteractions) return cb(true);
			// Save interactions:
			Interaction.create(device._interactions, function(err)
				{
					cb(err, results);
				});
		});
};

DeviceManager.prototype.clearInteractions = function(device, callback)
{
	var self = this;
	self.requestPost(device.shortAddress, COM_CLEAR, null, null, (function(err, packet, postCb)
		{
			if(err) { self.protocol.removeListener(String(device.shortAddress), postCb); if(callback) callback(err); return;}
			if(packet.message.control.commandType === ACK)
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				device._interactions = [];
				device._nInteractions = 0;
				Interaction.remove({"action_address": device.address}, function(err)
					{
						if(err) console.log("Error deleting all interactions from ", device.address, err);
						if(callback) callback(err);
					});
			}
			else if(packet.messafe.control.commandType === NACK) 
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				if(callback) return callback(new Error("got NACK"));
			}
			else
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				callback(new Error("Unexpected message"));
			}

		}), staticConfig.longTimeout);
};

// Adds interaction and reloads all entries
DeviceManager.prototype.addInteraction = function(device, interaction, cb)
{
	var self = this;
	self.requestPost(device.shortAddress, COM_ADDENTRY, null, interaction.toBuffer(), (function(err, packet, postCb)
		{
			if(err) {self.protocol.removeListener(String(device.shortAddress), postCb); if(cb) cb(err); return;}
			if(packet.message.control.commandType === ACK)
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				// Reload interactions:
				Interaction.remove({"action_address": device.address}, function(err)
					{
						if(err) {
							console.log("Error deleting all interactions from ", device.address, err);
							if(cb) cb(err);
						}
						device._interactions = [];
						async.series([
							async.retry(3, (function(callback){ self.fetchNInteractions(device, callback); }) ),
							async.retry(3, (function(callback){ self.fetchInteractions(device, callback); }) )
							], 
							function(err, results)
							{
								// Save device for new NInteractions:
								device.save(function(err, device)
									{
										if(cb) cb(err, results);
									});
							});
					});
			}
			else if(packet.message.control.commandType === NACK)
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				if(cb) cb(new Error("got NACK"));
			}
			else
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				cb(new Error("Unexpected message"));
			}
		}), staticConfig.longTimeout);
};

DeviceManager.prototype.removeInteraction = function(device, interactionN, cb)
{
	var self = this;
	self.requestPost(device.shortAddress, COM_DELENTRY, interactionN, null, (function(err, packet, postCb)
		{
			if(err) {self.protocol.removeListener(String(device.shortAddress), postCb); if(cb) cb(err); return;}
			if(packet.message.control.commandType === ACK)
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				// Reload interactions:
				Interaction.remove({"action_address": device.address}, function(err)
					{
						if(err) {
							console.log("Error deleting all interactions from ", device.address, err);
							if(cb) cb(err);
						}
						device._interactions = [];
						async.series([
							async.retry(3, (function(callback){ self.fetchNInteractions(device, callback); }) ),
							async.retry(3, (function(callback){ self.fetchInteractions(device, callback); }) )
							], 
							function(err, results)
							{
								// Save device for new NInteractions:
								device.save(function(err, device)
									{
										if(cb) cb(err, results);
									});
							});
					});
			}
			else if(packet.message.control.commandType === NACK) 
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				if(cb) cb(new Error("got NACK"));
			}
			else
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				cb(new Error("Unexpected message"));
			}
		}), staticConfig.longTimeout);
};

DeviceManager.prototype.editInteraction = function(device, interactionN, interaction, cb)
{
	var self = this;
	self.requestPost(device.shortAddress, COM_ENTRY, interactionN, interaction.toBuffer(), (function(err, packet, postCb)
		{
			if(err) {self.protocol.removeListener(String(device.shortAddress), postCb); if(cb) cb(err); return;}
			if(packet.message.control.commandType === ACK)
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				// Reload interactions:
				Interaction.remove({"action_address": device.address}, function(err)
					{
						if(err) {
							console.log("Error deleting all interactions from ", device.address, err);
							if(cb) cb(err);
						}
						device._interactions = [];
						async.series([
							async.retry(3, (function(callback){ self.fetchNInteractions(device, callback); }) ),
							async.retry(3, (function(callback){ self.fetchInteractions(device, callback); }) )
							], 
							function(err, results)
							{
								// Save device for new NInteractions:
								device.save(function(err, device)
									{
										if(cb) cb(err, results);
									});
							});
					});
			}
			else if(packet.message.control.commandType === NACK) 
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				if(cb) cb(new Error("got NACK"));
			}
			else
			{
				self.protocol.removeListener(String(device.shortAddress), postCb);
				cb(new Error("Unexpected message"));
			}
		}), staticConfig.longTimeout);
};

var deviceManager = new DeviceManager();
module.exports = deviceManager;