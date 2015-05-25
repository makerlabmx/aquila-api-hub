"use strict";
// deviceManager.js

var util = require("util");
var mongoose = require("mongoose");
var Device = mongoose.model("Device");
var Action = mongoose.model("Action");
var Event = mongoose.model("Event");
var Interaction = mongoose.model("Interaction");

var events = require("events");
var async = require("async");
var mqtt = require("mqtt");
var transport = require("./transport");

var configManager = require("./../../configManager");
var staticConfig = require(configManager.deviceManagerPath);

/*
    Device manager:

    Events:
        deviceAdded                 (device discovered or becomes active)
        deviceRemoved                   (device becomes inactive)
        event(device, eventN, param)    (when a device emits an event)

    MQTT topics:
    in      /announce   {"device": "<MAC>", "transport": ... }
    in      /disconnect {"device": "<MAC>"}
    in      /event      {"device": "<MAC>", "name": "<Event name>", "n": <event number>, "param": <param or null> }
    out     /action     {"device": "<MAC>", "n": <action number>, "param": <param or null> }
    in      /actionResponse     {"device": "<MAC>", "confirm": <true or false>, "message": "<optional cause>" }
    out     /service    {"device": "<MAC>", "name": "<Service Name>", "method": "<GET, POST, PUT or DELETE>", "data": <Buffer data> }
    in      /serviceResponse    {"device": "<MAC>", "status": <Status code>, "data": <Buffer data> }
    out     /wserial    {"device": "<MAC>", "data": <Buffer data> }
    in      /wserial    {"device": "<MAC>", "data": <Buffer data> }
    out     /discover
    out     /ping       {"device": "<MAC>"}
    in      /pingResponse       {"device": "<MAC>", "transport": ...}

    Notes:
        /action, /service requests, limit one at a time
        
 */

var TIMEOUT = 1000;

var onWithTimeout = function(emitter, event, timeout, callback)
{
    var tout = null;

    var cb = function(err, res)
    {
        if(!callback) callback = function(){};
        if(tout) { 
            clearTimeout(tout); 
            tout = null;
            if(err) return callback(err);
            callback(null, res);
        }
    };

    var onTout = function()
    {
        if(tout === null) return;
        tout = null;

        emitter.removeListener(event, cb);
        if(callback) callback(new Error("Timeout"));
    };

    tout = setTimeout(onTout, timeout);

    emitter.on(event, cb);
};

var DeviceManager = function()
{
    var self = this;
    self.ready = false;
    self.client = mqtt.connect("mqtt://localhost:1883");

    self.services = {};
    // request methods
    self.services.GET = 0x00;
    self.services.PUT = 0x01;
    self.services.POST = 0x02;
    self.services.DELETE = 0x03;
    // responses
    self.services.R200 = 0x04;   // OK
    self.services.R404 = 0x05;   // Service not found
    self.services.R405 = 0x06;   // Method not allowed
    self.services.R408 = 0x07;   // Timeout
    self.services.R500 = 0x08;   // Service error

    self.client.on("connect", function()
    {
        self.client.subscribe("announce");
        self.client.subscribe("disconnect");
        self.client.subscribe("event");
        self.client.subscribe("action");
        self.client.subscribe("actionResponse");
        self.client.subscribe("service");
        self.client.subscribe("serviceResponse");
        self.client.subscribe("wserial");
        self.client.subscribe("ping");
        self.client.subscribe("pingResponse");

        self.ready = true;
        self.emit("ready");
    });

    self.client.on("message", function(topic, message)
        {
            try
            {
                message = JSON.parse(message.toString('utf8'));
            }
            catch(e)
            {
                return;
            }
            if(topic === "announce") self.onAnnounce(message);
            if(topic === "disconnect") self.onDisconnect(message);
            if(topic === "event") self.onEvent(message);
            if(topic === "actionResponse") self.onAction(message);
            //if(topic === "service") self.onService(message);
            if(topic === "serviceResponse") self.onService(message);
            if(topic === "wserial") self.onWSerial(message);
            if(topic === "pingResponse") self.onPing(message);

        });
};

util.inherits(DeviceManager, events.EventEmitter);

DeviceManager.prototype.onAnnounce = function(message)
{
    var self = this;
    if(typeof(message.device) !== "string") return;

    Device.findById(message.device, function(err, device)
        {
            if(err) return console.log(err);

            // prepare actions:
            var actions = [];
            for(var i = 0; i < message.actions.length; i++)
            {
                actions.push(new Action({ n: message.actions[i].n, name: message.actions[i].name }));
            }

            // prepare events:
            var events = [];
            for(var i = 0; i < message.events.length; i++)
            {
                events.push(new Action({ n: message.events[i].n, name: message.events[i].name }));
            }

            if(!device)
            {
                // Create new device
                device = new Device(
                    {
                        _id: message.device,
                        transport: { 
                            transportId: message.transport.transportId,
                            type: message.transport.type,
                            hwAddress: new Buffer(message.transport.hwAddress),
                            shortAddress: String(message.transport.shortAddress)
                            },
                        class: message.class,
                        name: message.name,
                        _defaultName: message.name,
                        active: true,
                        actions: actions,
                        events: events,
                        services: message.services,
                        icon: "fa-lightbulb-o"
                    });
            }
            else
            {
                // Reload and mark active
                device.transport = { 
                            transportId: message.transport.transportId,
                            type: message.transport.type,
                            hwAddress: new Buffer(message.transport.hwAddress),
                            shortAddress: String(message.transport.shortAddress)
                            };
                device.class = message.class;
                device._defaultName = message.name;
                device.active = true;
                device.actions = actions;
                device.events = events;
                device.services = message.services;
            }

            device.save(function(err, device)
                {
                    if(err) return console.log("Error", err);
                    self.emit("deviceAdded");
                });
        });

};

DeviceManager.prototype.onDisconnect = function(message)
{
    var self = this;
    if(typeof(message.device) !== "string") return;

    Device.findById(message.device, function(err, device)
        {
            if(err) return console.log(err);
            if(!device) return;

            device.active = false;

            device.save(function(err, device)
                {
                    if(err) return console.log("Error", err);
                    self.emit("deviceRemoved");
                });
        });
};

DeviceManager.prototype.onEvent = function(message)
{
    var self = this;
    if(typeof(message.device) !== "string") return;

    Device.findById(message.device, function(err, device)
    {
        if(err) return console.log(err.message);
        if(device) self.emit("event", device, message.n, message.param, message.name);
    });
};

DeviceManager.prototype.onAction = function(message)
{
    // Handle action response
    var self = this;
    if(typeof(message.device) !== "string") return;

    self.emit("actionResponse", null, message);
};

DeviceManager.prototype.onService = function(message)
{
    // Handle service response
    var self = this;
    if(typeof(message.device) !== "string") return;

    self.emit("serviceResponse", null, message);
};

DeviceManager.prototype.onWSerial = function(message)
{
    // Handle service response
    var self = this;
    if(typeof(message.device) !== "string") return;

    self.emit("wserialData", null, message);
};

DeviceManager.prototype.onPing = function(message)
{
    // Handle ping response
    var self = this;
    if(typeof(message.device) !== "string") return;

    self.emit("pingResponse", null, message);
};

DeviceManager.prototype.discover = function(callback)
{
    var self = this;
    self.client.publish("discover", "", { qos: 2 }, function()
        {
            if(callback) callback();
        });
};

DeviceManager.prototype.ping = function(address, callback)
{
    var self = this;
    var msg = { device: address };
    self.client.publish("ping", JSON.stringify(msg), { qos: 1 });

    onWithTimeout(self, "pingResponse", TIMEOUT, function(err, res)
        {
            if(!callback) callback = function(){};
            if(err) return callback(err);
            callback(null, res);
        });
};

// CHANGE: now address is the MAC address for coherence
// TODO: add request buffer
DeviceManager.prototype.requestAction = function(address, action, param, callback)
{
    var self = this;
    var msg = { device: address, n: action, param: param };
    self.client.publish("action", JSON.stringify(msg), { qos: 2 });

    // Wait response with timeout
    onWithTimeout(self, "actionResponse", TIMEOUT, function(err, res)
        {
            if(!callback) callback = function(){};
            if(err) return callback(err);
            callback(null, res);
        });
};

DeviceManager.prototype.requestService = function(address, method, service, callback, data)
{
    var self = this;
    var msg = { device: address, method: method, name: service, data: data };
    self.client.publish("service", JSON.stringify(msg), { qos: 2 });

    onWithTimeout(self, "serviceResponse", TIMEOUT, function(err, res)
        {
            if(!callback) callback = function(){};
            if(err) return callback(err);
            callback(null, res.device, res.status, res.data);
        });
};

DeviceManager.prototype.sendWSerial = function(address, data)
{
    var self = this;
    var msg = { device: device, data: data };
    self.client.publish("wserial", JSON.stringify(msg), { qos: 2 });
};

var deviceManager = new DeviceManager();
module.exports = deviceManager;