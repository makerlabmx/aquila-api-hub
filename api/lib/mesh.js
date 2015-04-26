"use strict";

var util = require("util");
var Bridge = require("./bridge");
var addressParser = require("./addressParser");
var events = require("events");
var Packet = require("./meshPacket.js");

var MESH_DEFAULTPAN = 0xCA5A;
var MESH_DEFAULTCHAN = 26;
var MESH_ENDPOINT = 15;
var MESH_CMD_GETEUI = 0;
var MESH_CMD_RESEUI = 1;

var MESH_PING_TIMEOUT = 200;

var Mesh = function()
{
    var self = this;

    // Constant
    self.AQUILAMESH_MAXPAYLOAD = 105;
    self.BROADCAST = 0xFFFF;

    this.PAN = MESH_DEFAULTPAN;
    this.CHANNEL = MESH_DEFAULTCHAN;

    this.bridge = new Bridge();
    this.ready = false;

    // Will get this from bridge
    this.localAddr = 0x00FF;
    this.localEUIAddr = new Buffer([0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    this.securityEnabled = false;

    if(self.bridge.fake)
    {
        console.log("Started with fake bridge");
        self.ready = true;
        self.emit("ready");
    }

    this.bridge.on("ready", function()
        {
            self.localEUIAddr = self.bridge.longAddress;
            console.log("Bridge EUI Address: ", addressParser.toString(self.localEUIAddr));
            self.ready = true;

            // Data handler:
            self.bridge.on("data", function(packet)
                {
                    self.emit("endpoint" + String(packet.dstEndpoint), packet);
                });

            // Handle GETEUI commands (addr collision already handled by bridge):
            self.openEndpoint(MESH_ENDPOINT, function(packet)
                {
                    if(packet.data.length > 0)
                    {
                        if(packet.data[0] === MESH_CMD_GETEUI)
                        {
                            self.announce(packet.srcAddr);
                        }
                        else if(packet.data[0] === MESH_CMD_RESEUI && packet.data.length >= 9)
                        {
                            var euiAddr = packet.data.slice(1, 9);
                            self.emit("gotAnnounce", packet.srcAddr, euiAddr);
                        }
                    }
                });

            self.emit("ready");
        });
};

util.inherits(Mesh, events.EventEmitter);

Mesh.prototype.setAddr = function(shortAddr)
{
    var self = this;
    self.localAddr = shortAddr;

    var options = {
        prom: false,
        pan: self.PAN,
        chan: self.CHANNEL,
        addr: self.localAddr
    };

    self.bridge.setOptions(options);
};

Mesh.prototype.setPanId = function(panId)
{
    var self = this;
    if(typeof(panId) === "number")
        {
            self.PAN = panId;
            var options = {
                prom: false,
                pan: self.PAN,
                chan: self.CHANNEL,
                addr: self.localAddr
            };

            self.bridge.setOptions(options);
        }
};

Mesh.prototype.setChannel = function(channel)
{
    var self = this;
    if(typeof(channel) === "number")
        {
            self.CHANNEL = channel;
            var options = {
                prom: false,
                pan: self.PAN,
                chan: self.CHANNEL,
                addr: self.localAddr
            };

            self.bridge.setOptions(options);
        }
};

// handler must be a function that receives a packet.
Mesh.prototype.openEndpoint = function(endpointN, handler)
{
    var self = this;
    self.on("endpoint" + String(endpointN), handler);
};

Mesh.prototype.getShortAddr = function()
{
    return this.localAddr;
};

Mesh.prototype.getEUIAddr = function()
{
    return this.localEUIAddr;
};

Mesh.prototype.setSecurityKey = function(key)
{
    var self = this;

    var sec =  {
        enabled: self.bridge.currentSecurity.enabled,
        key: key
    };

    self.bridge.setSecurity(sec);
};

Mesh.prototype.setSecurityEnabled = function(enabled)
{
    var self = this;
    self.securityEnabled = enabled;
    var sec =  {
        enabled: enabled,
        key: self.bridge.currentSecurity.key
    };

    self.bridge.setSecurity(sec);
};

Mesh.prototype.getSecurityEnabled = function()
{
    return this.securityEnabled;
};

Mesh.prototype.sendPacket = function(packet, callback)
{
    var self = this;
    self.bridge.sendData(packet, callback);
};

Mesh.prototype.announce = function(dest)
{
    var self = this;
    var data = Buffer.concat([new Buffer([MESH_CMD_RESEUI]), new Buffer([self.localEUIAddr])]);
    var pkt = new Packet(0xFF, 0xFF,
                                            self.localAddr,
                                            dest,
                                            MESH_ENDPOINT, MESH_ENDPOINT,
                                            data.length,
                                            data);
    self.sendPacket(pkt);
};

// Callback must be function(err, srcAddr, srcEUIAddr)
Mesh.prototype.ping = function(dest, callback)
{
    var self = this;
    var packet = new Packet(0xFF, 0xFF,
                                                    self.localAddr,
                                                    dest,
                                                    MESH_ENDPOINT, MESH_ENDPOINT,
                                                    1,
                                                    new Buffer([MESH_CMD_GETEUI]));

    self.sendPacket(packet);

    if(dest !== self.BROADCAST)
    {
        var tout = null;
        var responseCb = function(srcAddr, euiAddr)
        {
            if(tout)
                {
                    // If its from the expected address
                    if(srcAddr === dest)
                        {
                            clearTimeout(tout);
                            // remove listener for only calling this once
                            self.removeListener("gotAnnounce", responseCb);
                            if(callback) callback(null, srcAddr, euiAddr);
                        }
                    }
                };

                tout = setTimeout(function()
                {
                    tout = null;
                    // Remove callback from event
                    self.removeListener("gotAnnounce", responseCb);
                    if(callback) callback(new Error("Timeout") );
                }, MESH_PING_TIMEOUT);

                self.on("gotAnnounce", responseCb);
    }
    else if(callback) callback(null, null, null);

};

var mesh = new Mesh();

module.exports = mesh;
