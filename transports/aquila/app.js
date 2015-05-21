"use strict";

var macaddress = require("macaddress");
var mqtt = require("mqtt");

var mac = null;
var defaultMsg = null;
var client = null;

// TODO: remove database
var mongoose = require("mongoose");
var app = function(){};
var DeviceModel = require("./models/device").Device(app, mongoose);
var InteractionModel = require("./models/interaction").Interaction(app, mongoose);
var deviceManager = null;
var services = require("./lib/services");
var Device = mongoose.model("Device");

var init = function()
{
    macaddress.one(function(err, mac)
    {
        if(err) return console.log("Error:", err);
        mac = mac.toUpperCase().replace(/:/g, "");
        defaultMsg = { mac: mac, type: "aquila" };
        client = mqtt.connect("mqtt://localhost:1883", { will: { topic: "removeTransport", payload: JSON.stringify(defaultMsg), qos: 2, retain: false } });

        client.on("connect", function()
        {
            client.subscribe("event");
            client.subscribe("action");
            client.subscribe("service");
            client.subscribe("wserial");
            client.subscribe("discover");
            client.subscribe("ping");

            client.publish("registerTransport", JSON.stringify(defaultMsg), { qos: 2 });
        });

        client.on("message", function(topic, message)
            {
                try {
                        message = JSON.parse(message);
                    } catch(e)
                    {
                        return;
                    }

                if(topic === "discover")
                {
                   deviceManager.reload();
                }
                if(topic === "action")
                {
                    deviceManager.requestAction(message.device, message.n, message.param);
                }
                if(topic === "service")
                {
                    Device.findById(message.device, function(err, device)
                        {
                            if(err) return console.log(err);
                            if(!device) return;
                            services.request(device.shortAddress, message.method, message.name, function(err, srcAddr, status, data)
                                {
                                    var message = null;
                                    if(err) { status = services.R500; message = err.message}// publish with error
                                    var msg = { device: device._id, status: status, message: message, data: data };
                                    client.publish("serviceResponse", JSON.stringify(msg), { qos: 2 });
                                }, message.data);
                        });
                }
            });

        deviceManager.on("deviceAdded", function(device)
            {
                var msg =   { 
                                device: device._id, 
                                transport: {
                                        transportId: mac,
                                        type: "aquila",
                                        hwAddress: device.address,
                                        shortAddress: String(device.shortAddress)
                                    },
                                class: device.class,
                                name: device._defaultName,
                                _defaultName: device._defaultName,
                                actions: device.actions,
                                events: device.events,
                                services: []
                            };
                client.publish("announce", JSON.stringify(msg), { qos: 2 });
            });

        deviceManager.on("deviceRemoved", function(device)
            {
                var msg = { device: device._id };
                client.publish("disconnect", JSON.stringify(msg), { qos: 2 });
            });

        // TODO: add a way to disperse event between networks. Idea: recognize by transport mac
        deviceManager.on("event", function(device, eventN, param, eName)
            {
                var msg = { device: device._id, name: eName, n: eventN, param: param };
                client.publish("event", JSON.stringify(msg), { qos: 2 });
            });
    });
};

mongoose.connect("mongodb://localhost/aquila-transport", function(err, res)
    {
        if(err)
        {
            console.log("ERROR connecting to database, make shure that mongodb is installed and running.");
            process.exit(1);
        }
        console.log("Connected to Database");

        deviceManager = require("./deviceManager");


        var onReady = function()
        {
            init();
            //deviceManager.discover();
        }

        if(deviceManager.ready) onReady();
        else deviceManager.on("ready", onReady);

    });