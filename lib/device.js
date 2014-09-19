var events = require("events");
var async = require("async");
var addressParser = require("./addressParser");
var Entry = require("./entry.js");

var LONGTIMEOUT = 1000;

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

var Action = function()
{
	this.n = 0;
	this.name = "";
};

var Event = function()
{
	this.n = 0;
	this.name = "";
};

var Device = function(manager)
{
	var self = this;

	this.manager = manager;

	this.active = true;

	this.address = "";
	this.class = "";
	this.name = "";
	this._defaultName = "";
	this.nActions = 0;
	this.nEvents = 0;
	this.nEntries = 0;
	this.maxEntries = 0;

	this.actions = [];
	this.events = [];
	this.entries = [];

	this.manager.protocol.on("event", function(packet)
	{
		if(addressParser.compare(packet.srcAddr, self.address))
		{
			var eventN = packet.message.command[0];
			for(var i = 0; i < self.events.length; i++)
			{
				if(self.events[i].n === eventN) 
				{
					//console.log("Event: ", self.events[i].name, self.address);
					if(packet.message.control.hasParam && packet.message.param)
					{
						self.emit(self.events[i].name, packet.message.param[0]);
					}
					else
					{
						self.emit(self.events[i].name, null);
					}
					return;
				}
			}
		}
	});
};

Device.prototype.__proto__ = events.EventEmitter.prototype;

Device.prototype.setName = function(name)
{
	this.manager.setDeviceName(this.address, name);
}

Device.prototype.toSerializable = function()
{
	var self = this;
	var serializableObj = {
		active: self.active,
		address: self.address,
		class: self.class,
		name: self.name,
		_defaultName: self._defaultName,
		nActions: self.nActions,
		nEvents: self.nEvents,
		nEntries: self.nEntries,
		maxEntries: self.maxEntries,
		actions: self.actions,
		events: self.events,
		entries: self.entries
	};

	return serializableObj;
};

Device.prototype.fromSerializable = function(serializable)
{
	this.active = serializable.active;
	this.address = serializable.address;
	this.class = serializable.class;
	this.name = serializable.name;
	this._defaultName = serializable._defaultName;
	this.nActions = serializable.nActions;
	this.nEvents = serializable.nEvents;
	this.nEntries = serializable.nEntries;
	this.maxEntries = serializable.maxEntries;
	this.actions = serializable.actions;
	this.events = serializable.events;
	this.entries = serializable.entries;
}

Device.prototype.toJSON = function()
{
	var self = this;
	var jsonObj = this.toSerializable();
	return jsonObj;
};

Device.prototype.ping = function(callback)
{
	this.manager.requestGet(this.address, COM_CLASS, null, null, callback);
};

Device.prototype.getActionNumber = function(name)
{
	for(var i = 0; i < this.actions.length; i++)
	{
		if(this.actions[i].name === name)
		{
			return this.actions[i].n;
		}
	}

	return null;
};

Device.prototype.getActionName = function(n)
{
	for(var i = 0; i < this.actions.length; i++)
	{
		if(this.actions[i].n === n)
		{
			return this.actions[i].name;
		}
	}

	return null;
};

Device.prototype.getEventNumber = function(name)
{
	for(var i = 0; i < this.events.length; i++)
	{
		if(this.events[i].name === name)
		{
			return this.events[i].n;
		}
	}
	
	return null;
};

Device.prototype.getEventName = function(n)
{
	for(var i = 0; i < this.events.length; i++)
	{
		if(this.events[i].n === n)
		{
			return this.events[i].name;
		}
	}
	
	return null;
};

Device.prototype.action = function(action, param)
{
	if(typeof action === "string") action = this.getActionNumber(action);
	if(typeof action === "number") this.manager.requestAction(this.address, action, param);
};

Device.prototype.fetchAll = function(cb)
{
	//console.log("fetchAll");
	async.series([
		async.retry(3, (function(callback){ this.fetchName(callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchNActions(callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchNEvents(callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchNEntries(callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchMaxEntries(callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchActions(callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchEvents(callback); }).bind(this) ),
		async.retry(3, (function(callback){ this.fetchEntries(callback); }).bind(this) )
		], 
		function(err, results)
		{
			cb(err, results);
		});
};

Device.prototype.fetchName = function(callback)
{
	//console.log("fetchName");
	this.manager.requestGet(this.address, COM_NAME, null, null, (function(err, packet, getCb)
	{
		if(err) { this.manager.protocol.removeListener(this.address, getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_NAME)
		{
			this.manager.protocol.removeListener(this.address, getCb);
			this.name = packet.message.data.toString("utf8");
			this._defaultName = this.name;
			callback(null);
		}
		//else callback(new Error("Unexpected message"));

	}).bind(this));
};

Device.prototype.fetchNActions = function(callback)
{
	//console.log("fetchNActions");
	this.manager.requestGet(this.address, COM_NACTIONS, null, null, (function(err, packet, getCb)
	{
		if(err) { this.manager.protocol.removeListener(this.address, getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_NACTIONS)
		{
			this.manager.protocol.removeListener(this.address, getCb);
			this.nActions = packet.message.data[0];
			callback(null);
		}
		//else callback(new Error("Unexpected message"));

	}).bind(this));
};

Device.prototype.fetchNEvents = function(callback)
{
	//console.log("fetchNEvents");
	this.manager.requestGet(this.address, COM_NEVENTS, null, null, (function(err, packet, getCb)
	{
		if(err) { this.manager.protocol.removeListener(this.address, getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_NEVENTS)
		{
			this.manager.protocol.removeListener(this.address, getCb);
			this.nEvents = packet.message.data[0];
			callback(null);
		}
		//else callback(new Error("Unexpected message"));

	}).bind(this));
};

Device.prototype.fetchNEntries = function(callback)
{
	//console.log("fetchNEntries");
	this.manager.requestGet(this.address, COM_NENTRIES, null, null, (function(err, packet, getCb)
	{
		if(err) { this.manager.protocol.removeListener(this.address, getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_NENTRIES)
		{
			this.manager.protocol.removeListener(this.address, getCb);
			this.nEntries = packet.message.data[0];
			callback(null);
		}
		//else callback(new Error("Unexpected message"));

	}).bind(this));
};

Device.prototype.fetchMaxEntries = function(callback)
{
	this.manager.requestGet(this.address, COM_SIZE, null, null, (function(err, packet, getCb)
	{
		if(err) { this.manager.protocol.removeListener(this.address, getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_SIZE)
		{
			this.manager.protocol.removeListener(this.address, getCb);
			this.maxEntries = packet.message.data[0];
			callback(null);
		}
		//else callback(new Error("Unexpected message"));

	}).bind(this));
};

Device.prototype.fetchAction = function(n, callback)
{
	//console.log("fetchAction ", n);
	this.manager.requestGet(this.address, COM_ACTION, n, null, (function(err, packet, getCb)
	{
		if(err) { this.manager.protocol.removeListener(this.address, getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_ACTION)
		{
			this.manager.protocol.removeListener(this.address, getCb);
			var newAction = new Action();
			newAction.n = packet.message.param[0];
			newAction.name = packet.message.data.toString("utf8");

			var alreadyAdded = false;
			for(var actn in this.actions)
			{
				if(this.actions[actn].n === newAction.n) alreadyAdded = true;
			}

			if(!alreadyAdded) this.actions.push(newAction);
			callback(null);
		}
		//else callback(new Error("Unexpected message"));

	}).bind(this));
};

Device.prototype.fetchActions = function(cb)
{
	//console.log("fetchActions");
	var fcns = [];

	for(var i = 0; i < this.nActions; ++i)
	{
		(function()
		{
			var j = i;
			fcns.push(async.retry(3, (function(callback){ this.fetchAction(j, callback); }).bind(this)) );
		}).bind(this)();
	}

	async.series(fcns, function(err, results)
		{
			cb(err, results);
		});
};

Device.prototype.fetchEvent = function(n, callback)
{
	//console.log("fetchEvent ", n);
	this.manager.requestGet(this.address, COM_EVENT, n, null, (function(err, packet, getCb)
	{
		if(err) { this.manager.protocol.removeListener(this.address, getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_EVENT)
		{
			this.manager.protocol.removeListener(this.address, getCb);
			var newEvent = new Event();
			newEvent.n = packet.message.param[0];
			newEvent.name = packet.message.data.toString("utf8");

			var alreadyAdded = false;
			for(var evt in this.events)
			{
				if(this.events[evt].n === newEvent.n) alreadyAdded = true;
			}

			if(!alreadyAdded) this.events.push(newEvent);
			callback(null);
		}
		//else callback(new Error("Unexpected message"));

	}).bind(this));
};

Device.prototype.fetchEvents = function(cb)
{
	//console.log("fetchEvents");
	var fcns = [];

	for(var i = 0; i < this.nEvents; ++i)
	{
		(function()
		{
			var j = i;
			fcns.push(async.retry(3, (function(callback){ this.fetchEvent(j, callback); }).bind(this) ));
		}).bind(this)();
	}

	async.series(fcns, function(err, results)
		{
			cb(err, results);
		});
};

Device.prototype.fetchEntry = function(n, callback)
{
	//console.log("fetchEntry ", n);
	this.manager.requestGet(this.address, COM_ENTRY, n, null, (function(err, packet, getCb)
	{
		if(err) { this.manager.protocol.removeListener(this.address, getCb); callback(err); return; }
		if(packet.message.control.commandType === POST && packet.message.command[0] === COM_ENTRY)
		{
			this.manager.protocol.removeListener(this.address, getCb);
			var newEntry = new Entry();
			newEntry.n = packet.message.param[0];
			// parse entry
			newEntry.fromBuffer(packet.message);

			//console.log(">>>>>>>>>>>>>>>> new entry: ",newEntry);

			var alreadyAdded = false;
			for(var entr in this.entries)
			{
				if(this.entries[entr].n === newEntry.n) alreadyAdded = true;
			}

			if(!alreadyAdded) this.entries.push(newEntry);
			callback(null);
		}
		//else callback(new Error("Unexpected message"));

	}).bind(this));
};

Device.prototype.fetchEntries = function(cb)
{
	//console.log("fetchEntries");
	var self = this;
	var fcns = [];

	for(var i = 0; i < this.nEntries; ++i)
	{
		(function()
		{
			var j = i;
			fcns.push(async.retry(3, (function(callback){ this.fetchEntry(j, callback); }).bind(this) ));
		}).bind(this)();
	}

	async.series(fcns, function(err, results)
		{
			cb(err, results);
		});
};

Device.prototype.clearEntries = function(callback)
{
	this.manager.requestPost(this.address, COM_CLEAR, null, null, (function(err, packet, postCb)
		{
			if(err) { this.manager.protocol.removeListener(this.address, postCb); if(callback) callback(err); return;}
			if(packet.message.control.commandType === ACK)
			{
				this.manager.protocol.removeListener(this.address, postCb);
				this.entries = [];
				this.nEntries = 0;
				if(callback) callback(null);
			}
			else if(packet.messafe.control.commandType === NACK) 
			{
				this.manager.protocol.removeListener(this.address, postCb);
				if(callback) callback(new Error("got NACK"));
			}
		}).bind(this), LONGTIMEOUT);
};

// Adds entry and reloads all entries
Device.prototype.addEntry = function(entry, cb)
{
	this.manager.requestPost(this.address, COM_ADDENTRY, null, entry.toBuffer(), (function(err, packet, postCb)
		{
			if(err) {this.manager.protocol.removeListener(this.address, postCb); if(cb) cb(err); return;}
			if(packet.message.control.commandType === ACK)
			{
				this.manager.protocol.removeListener(this.address, postCb);
				this.entries = [];
				async.series([
					async.retry(3, (function(callback){ this.fetchNEntries(callback); }).bind(this) ),
					async.retry(3, (function(callback){ this.fetchEntries(callback); }).bind(this) )
					], 
					function(err, results)
					{
						if(cb) cb(err, results);
					});
			}
			else if(packet.messafe.control.commandType === NACK)
			{
				this.manager.protocol.removeListener(this.address, postCb);
				if(cb) cb(new Error("got NACK"));
			}
		}).bind(this), LONGTIMEOUT);
};

Device.prototype.removeEntry = function(entryN, cb)
{
	this.manager.requestPost(this.address, COM_DELENTRY, entryN, null, (function(err, packet, postCb)
		{
			if(err) {this.manager.protocol.removeListener(this.address, postCb); if(cb) cb(err); return;}
			if(packet.message.control.commandType === ACK)
			{
				this.manager.protocol.removeListener(this.address, postCb);
				this.entries = [];
				async.series([
					async.retry(3, (function(callback){ this.fetchNEntries(callback); }).bind(this) ),
					async.retry(3, (function(callback){ this.fetchEntries(callback); }).bind(this) )
					], 
					function(err, results)
					{
						if(cb) cb(err, results);
					});
			}
			else if(packet.messafe.control.commandType === NACK) 
			{
				this.manager.protocol.removeListener(this.address, postCb);
				if(cb) cb(new Error("got NACK"));
			}
		}).bind(this), LONGTIMEOUT);
};

Device.prototype.editEntry = function(entryN, entry, cb)
{
	this.manager.requestPost(this.address, COM_ENTRY, entryN, entry.toBuffer(), (function(err, packet, postCb)
		{
			if(err) {this.manager.protocol.removeListener(this.address, postCb); if(cb) cb(err); return;}
			if(packet.message.control.commandType === ACK)
			{
				this.manager.protocol.removeListener(this.address, postCb);
				this.entries = [];
				async.series([
					async.retry(3, (function(callback){ this.fetchNEntries(callback); }).bind(this) ),
					async.retry(3, (function(callback){ this.fetchEntries(callback); }).bind(this) )
					], 
					function(err, results)
					{
						if(cb) cb(err, results);
					});
			}
			else if(packet.messafe.control.commandType === NACK) 
			{
				this.manager.protocol.removeListener(this.address, postCb);
				if(cb) cb(new Error("got NACK"));
			}
		}).bind(this), LONGTIMEOUT);
};

module.exports = Device;