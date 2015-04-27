"use strict";

/*
 *  802.15.4 Dongle interface utility.
 *  Transfers 802.15.4 LWM packet frames to and from a USB Dongle via a serial port bridge.
 *
 *  Author: Rodrigo Méndez Gamboa, rmendez@makerlab.mx
 *
 *  Update: 24/04/15: Changed encapsulation protocol to SLIP (RFC 1055)(http://en.wikipedia.org/wiki/Serial_Line_Internet_Protocol),
 *                    added 16bit CRC to end of packet
 *
 *  Serial packet: [SLIP END (0xC0)][DATA (SLIP Escaped)][SLIP END (0xC0)]
 *  DATA packet: [Command][Command specific][CRC (16bit)]
 *
 *  Comands:
 *      CMD_DATA:           [Command specific] = lqi rssi srcAddr(16) dstAddr(16) srcEndpoint dstEndpoint frameSize [MAC Frame]
 *      CMD_ACK:            [Command specific] = RSSI                                               *Sent on data transmit success
 *      CMD_NACK:           [Command specific] = CAUSE                                              *Sent on data tranmit error
 *      CMD_GET_OPT:        [Command specific] = PROM* PAN_LOW PAN_HIGH CHAN**  ADDR_LOW ADDR_HIGH  *Returns the current options
 *      CMD_SET_OPT:        [Command specific] = PROM* PAN_LOW PAN_HIGH CHAN**  ADDR_LOW ADDR_HIGH  *0 or 1, **11-26
 *      CMD_GET_SECURITY:   [Command specific] = ENABLED                                            *Get if security enabled
 *      CMD_SET_SECURITY:   [Command specific] = ENABLED [SEC_KEY](16 byte, 128 bit)                *Set if security enabled and key
 *      CMD_START                                                                                   *Sent on bridge start or reset and in response to CMD_PING
 *      CMD_PING:                                                                                   *Sent by PC, response is CMD_START
 *      CMD_GET_LONG_ADDR:                                                                          *Get bridge MAC address
 */


/*
 *  Communication Secuence Diagrams:
 *
 *  PC  | CMD_PING  ------> | Bridge
 *      | <------ CMD_START |
 *      |                   |
 *
 *  PC  | CMD_DATA  ------------------> | Bridge
 *      | <-- CMD_ACK or CMD_NACK       |
 *      |                               |
 *
 *  PC  | CMD_SET_* ------------------> | Bridge
 *      | <--- CMD_SET_* (Confirmation) |
 *      |                               |
 *
 *  On Data reception:
 *  PC  | <------ CMD_DATA  | Bridge
 *      |                   |
 *
 *  On Bridge Startup:
 *  PC  | <------ CMD_START | Bridge
 *      |                   |
 *
 */

var util = require("util");
var SerialTransport  = require("./serialTransport");
var events = require("events");
var scanPorts = require("./scanports");
var configManager = require("./../../configManager");
var config = require(configManager.bridgePath);
var Packet = require("./meshPacket.js");
var logger = require("./bridgeLogger");

var TIMEOUT = 500;
var CHECK_ALIVE_INTERVAL = 60000;

// Constants:
var CMD_DATA            = 0;
var CMD_ACK             = 1;
var CMD_NACK            = 2;
var CMD_GET_OPT         = 3;
var CMD_SET_OPT         = 4;
var CMD_GET_SECURITY    = 5;
var CMD_SET_SECURITY    = 6;
var CMD_START           = 7;
var CMD_PING            = 8;
var CMD_GET_LONG_ADDR   = 9;
var CMD_SET_LONG_ADDR   = 10;

// Indexes
var COMMAND     = 0;
var OPT_PROM    = 1;
var OPT_PANL    = 2;
var OPT_PANH    = 3;
var OPT_CHAN    = 4;
var OPT_ADDRL   = 5;
var OPT_ADDRH   = 6;
var SEC_EN      = 1;
var SEC_KEY     = 2;

var D_LQI       = 1;
var D_RSSI      = 2;
var D_SRCADDRL  = 3;
var D_SRCADDRH  = 4;
var D_DSTADDRL  = 5;
var D_DSTADDRH  = 6;
var D_SRCEP     = 7;
var D_DSTEP     = 8;
var D_SIZE      = 9;
var D_DATA      = 10;

var Bridge = function(baudrate, port)
{
    var self = this;

    self.ready = false;
    self.transport = null;
    self.longAddress = new Buffer([0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    self.currentSecurity = {
        enabled: false,
        key: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
    self.currentOptions = {
        prom: false,
        pan: 0xCA5A,
        chan: 26,
        addr: 0x00FF
    };

    self.waitingResponse = false;
    self.buffer = [];

    if(baudrate === undefined) var baudrate = config.baudrate;
    if(port === undefined) var port = config.port;

    var init = function(port)
    {
        self.transport = new SerialTransport(baudrate, port);
        self.transport.on("ready", function()
            {
                // For when the bridge is not automatically restarted
                setTimeout(function(){self.getLongAddress()}, 1500);
            });
        self.transport.on("data", function(data)
            {
                self.parse(data);
            });

            self.transport.on("crcError", function(){ logger.warn("crcError", data) });
            self.transport.on("framingError", function(data){ logger.warn("framingError", data) });
            self.transport.on("escapeError", function(data){ logger.warn("escapeError", data) });
    };

    self.on("longAddressSet", function()
        {
            if(!self.ready)
            {
                self.ready = true;
                self.emit("ready");
                logger.info("Bridge ready");

                // Periodically check if still alive
                setInterval(function()
                    {
                        self.ping(function(err)
                            {
                                if(err) logger.error("Bridge not responding", String(err));
                            });
                    }, CHECK_ALIVE_INTERVAL);
            }
            else
            {
                // If we got longAddressSet confirm and wasn't expecting it,
                // the bridge could have just been restarted.
                // Proceed reconfiguring
                logger.info("Bridge restarted");
                self.setOptions(self.currentOptions);
                self.setSecurity(self.currentSecurity);
            }       
        });

    if(port) init(port);
    else scanPorts(baudrate, function(port)
        {
            init(port);
        });
};

util.inherits(Bridge, events.EventEmitter);

Bridge.prototype.parse = function(data)
{

    if(config.debug) console.log("Got data:", data);

    var self = this;

    if(data.length <= 0) return;

    var responseCmds = [CMD_ACK, CMD_NACK, CMD_SET_OPT, CMD_SET_SECURITY, CMD_START, CMD_SET_LONG_ADDR];

    if(data[COMMAND] === CMD_DATA)
    {
        if(data.length < 10) return;
        var lqi, rssi, srcAddr, dstAddr, srcEndpoint, dstEndpoint, size, frame;
        lqi         = data[D_LQI];
        rssi        = data[D_RSSI];
        srcAddr     = data[D_SRCADDRL];
        srcAddr     |= (data[D_SRCADDRH] << 8);
        dstAddr     = data[D_DSTADDRL];
        dstAddr     |= (data[D_DSTADDRH] << 8);
        srcEndpoint = data[D_SRCEP];
        dstEndpoint = data[D_DSTEP];
        size        = data[D_SIZE];

        if(data.length < 10 + size) return;
        frame = data.slice(10, 10 + size);

        self.emit("data", new Packet(lqi, rssi, srcAddr, dstAddr, srcEndpoint, dstEndpoint, size, frame));
    }

    if( responseCmds.indexOf(data[COMMAND]) != -1 )
    {
        self.emit("response", data);
    }

    if(data[COMMAND] === CMD_SET_LONG_ADDR)
    {
        if(data.length < 9) return;
        self.longAddress = data.slice(1, 9);
        self.emit("longAddressSet", self.longAddress);        
    }

};

Bridge.prototype.request = function(payload, callback)
{
    var self = this;
    self.buffer.push({
        payload: payload,
        callback: callback
    });
    self.requestNow();
};

Bridge.prototype.requestNow = function()
{
    var self = this;
    // Nothing to send
    if(self.buffer.length <= 0) return;
    // We are busy, do nothing
    if(self.waitingResponse) return;

    self.waitingResponse = true;
    var dat = self.buffer.shift();
    var payload = dat.payload;
    var callback = dat.callback;

    // Wait response or timeout
    var tout = null;
    var confirmCb = function(data)
    {
        if(tout)
        {
            clearTimeout(tout);
            self.removeListener("response", confirmCb);
            self.waitingResponse = false;

            if(callback) callback(null, data);

            // Send any other pending requests
            self.requestNow();
        }
    };

    tout = setTimeout(function()
        {
            tout = null;
            self.removeListener("response", confirmCb);
            self.waitingResponse = false;

            if(callback) callback(new Error("Send Timeout"));

            // Send any other pending requests
            self.requestNow();

        }, TIMEOUT);

    self.on("response", confirmCb);

    // Really send
    self.transport.write(payload);

};

// callback(err, status)
Bridge.prototype.sendData = function(packet, callback)
{
    var self = this;

    var frame = Buffer.concat([ new Buffer( [CMD_DATA, packet.lqi, packet.rssi, 
                                            packet.srcAddr&0xFF, (packet.srcAddr>>8)&0xFF,
                                            packet.dstAddr&0xFF, (packet.dstAddr>>8)&0xFF, 
                                            packet.srcEndpoint, packet.dstEndpoint, packet.size] ),
                                new Buffer( packet.data )]);
    self.request(frame, function(err, data)
        {
            if(!callback) return;
            if(err) return callback(err);
            if(data[COMMAND] === CMD_ACK)
            {
                var rssi = data[1];
                callback(null, rssi)
            }
            else if(data[COMMAND] === CMD_NACK)
            {
                var cause = data[1];
                // Cause, see LWM specification for values
                callback(new Error("NACK"), cause);
            }
            else
            {
                callback(new Error("Unexpected response"));
            }
        });
};

Bridge.prototype.ping = function(callback)
{
    this.request([CMD_PING], function(err, data)
        {
            if(!callback) return;
            if(err) return callback(err);
            if(data[COMMAND] === CMD_START) callback(null);
            else callback(new Error("Unexpected response"));
        });
};

Bridge.prototype.setOptions = function(options, callback)
{
    this.currentOptions = options;

    var payload = new Buffer([  CMD_SET_OPT, options.prom, options.pan&0xFF, (options.pan>>8)&0xFF, 
                                options.chan, options.addr&0xFF, (options.addr>>8)&0xFF]);

    this.request(payload, function(err, data)
        {
            if(!callback) return;
            if(err) return callback(err);
            if(data[COMMAND] === CMD_SET_OPT) 
            {
                if(data.length < 7) return callback(new Error("Corrupted response"));
                var opts = {
                    prom: data[OPT_PROM],
                    pan: data[OPT_PANL] | (data[OPT_PANH] << 8),
                    chan: data[OPT_CHAN],
                    addr: data[OPT_ADDRL] | (data[OPT_ADDRH] << 8)
                };
                callback(null, opts);
            }
            else callback(new Error("Unexpected response"));
        });
};

Bridge.prototype.getOptions = function(callback)
{
    this.request([CMD_GET_OPT], function(err, data)
        {
            if(!callback) return;
            if(err) return callback(err);
            if(data[COMMAND] === CMD_SET_OPT)
            {
                if(data.length < 7) return callback(new Error("Corrupted response"));
                var opts = {
                    prom: data[OPT_PROM],
                    pan: data[OPT_PANL] | (data[OPT_PANH] << 8),
                    chan: data[OPT_CHAN],
                    addr: data[OPT_ADDRL] | (data[OPT_ADDRH] << 8)
                };
                callback(null, opts);
            }
            else callback(new Error("Unexpected response"));
        });
};

Bridge.prototype.setSecurity = function(options, callback)
{
    // options = { enabled: true, key: [...] }
    this.currentSecurity = options;

    var payload = Buffer.concat([ new Buffer([CMD_SET_SECURITY, options.enabled]), new Buffer(options.key) ]);

    var self = this;
    this.request(payload, function(err, data)
        {
            if(!callback) return;
            if(err) return callback(err);
            if(data[COMMAND] === CMD_SET_SECURITY) 
            {
                if(data.length < 2) return callback(new Error("Corrupted response"));

                var sec = {
                    enabled: data[SEC_EN],
                    key: self.currentSecurity.key
                };

                callback(null, sec);
            }
            else callback(new Error("Unexpected response"));
        });
};

Bridge.prototype.getSecurity = function(callback)
{
    var self = this;
    this.request([CMD_GET_SECURITY], function(err, data)
        {
            if(!callback) return;
            if(err) return callback(err);
            if(data[COMMAND] === CMD_SET_SECURITY) 
            {
                if(data.length < 2) return callback(new Error("Corrupted response"));

                var sec = {
                    enabled: data[SEC_EN],
                    key: self.currentSecurity.key
                };

                callback(null, sec);
            }
            else callback(new Error("Unexpected response"));
        });
};

Bridge.prototype.getLongAddress = function(callback)
{
    this.request([CMD_GET_LONG_ADDR], function(err, data)
        {
            if(!callback) return;
            if(err) return callback(err);
            if(data[COMMAND] === CMD_SET_LONG_ADDR) 
            {
                if(data.length < 9) return callback(new Error("Corrupted response"));
                callback(null, data.slice(1, 9));
            }
            else callback(new Error("Unexpected response"));
        });
};

module.exports = Bridge;
