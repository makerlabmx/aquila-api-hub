"use strict";
// transport.js

/*
    Manages transport connections
    Transports are connected via MQTT or other methods supported by ponte

    Authentication via user and password
*/

var ponte = require("ponte");
var mqtt = require("mqtt");
var mongoose = require("mongoose");
var Transport = mongoose.model("Transport");

// TODO add auth
// TODO database path in config
var ponteOpts = {
    logger: {
        level: 'error'
    },
    http: {
        port: 3000 // tcp
    },
    mqtt: {
        port: 1883 // tcp
    },
    coap: {
        port: 3000 // udp
    },
    persistence: {
        //type: 'level',
        //path: "./db"
        type: 'mongo',
        url: 'mongodb://localhost:27017/ponte'
    }
};

var TransportController = function()
{
    var self = this;

    self.server = ponte(ponteOpts);

    // DBG
   /* self.server.on("updated", function(resource, buffer)
        {
            console.log("Resource updated", resource, buffer);
        });*/
    // DBG

    self.client = mqtt.connect("mqtt://localhost:1883");

    self.client.on("connect", function()
    {
        self.client.subscribe("registerTransport");
        self.client.subscribe("removeTransport");
    });

    self.client.on("message", function(topic, message)
        {
            // TODO: check if message is a vaild mac address in string format
            // message: {"mac":"FD23FD23DA23","type":"aquila"}
            if(message.length === 0) return;
            try
            {
                message = JSON.parse(message.toString("utf8"));
            }
            catch(e)
            {
                return;
            }

            if(typeof(message.mac) !== "string" || typeof(message.type) !== "string") return;
            var macAddr = message.mac;

            if(topic === "registerTransport")
            {
                // Check if not already registered
                Transport.findById(macAddr, function(err, transport)
                    {
                        if(err) return console.log(err);
                        if(!transport)
                        {
                            transport = new Transport(
                            {
                                _id: macAddr,
                                type: message.type,
                                active: true
                            }); 
                        }
                        transport.active = true;
                        transport.save();
                        console.log("registered transport", macAddr);
                    });
            }
            if(topic === "removeTransport")
            {
                Transport.findById(macAddr, function(err, transport)
                    {
                        if(err) return console.log(err);
                        if(!transport) return;
                        transport.active = false;
                        transport.save();
                        console.log("removed transport", macAddr);

                    });
            }
        });
    
};

var transportController = new TransportController();

module.exports = transportController;