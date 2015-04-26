"use strict";

var util = require("util");
var Serial = require("serialport");
var SerialPort = Serial.SerialPort;
var Slip = require("node-slip");
var events = require("events");

// CRC algorithm based on Xmodem AVR code
var calcCrc = function(data)
{
    var crc = 0;
    var size = data.length;
    var i;
    var index = 0;

    while(--size >= 0)
    {
        crc = (crc ^ data[index++] << 8) & 0xFFFF;
        i = 8;
        do
        {
            if(crc & 0x8000)
            {
                crc = (crc << 1 ^ 0x1021) & 0xFFFF;
            }
            else
            {
                crc = (crc << 1) & 0xFFFF;
            }
        } while(--i);
    }

    return crc & 0xFFFF;
};

var checkCrc = function(data)
{
    var dataCrc, calcdCrc;
    // Getting crc from packet
    dataCrc = (data[data.length - 1]) << 8;
    dataCrc |= (data[data.length - 2]) & 0x00FF;
    // Calculating crc
    calcdCrc = calcCrc(data.slice(0, data.length - 2));
    // Comparing
    return calcdCrc === dataCrc;
};

var SerialTransport = function(baudrate, port)
{
    var self = this;

    self.fake = false;

    // Serial port write buffer control
    self.writing = false;
    self.writeBuffer = [];

    var receiver = {
        data: function(input)
        {
            // Check CRC
            var crcOk = checkCrc(input);
            // Strip CRC data
            var data = input.slice(0, input.length - 2);

            if(crcOk)
            {
                self.emit("data", data);
            }
            else
            {
                self.emit("crcError", data);
            }
            
        },
        framing: function( input ) 
        {
            self.emit("framingError", input);
        },
        escape: function( input )
        {
            self.emit("escapeError", input);
        }
    };

    var parser = new Slip.parser(receiver);

    self.serialPort = new SerialPort(port,
        {
            baudrate: baudrate
        });

    self.serialPort.on("data", function(data)
    {
        parser.write(data);
    });

    self.serialPort.on("open", function()
    {
        self.emit("ready");
    });

};

util.inherits(SerialTransport, events.EventEmitter);

SerialTransport.prototype.write = function(data)
{
    var self = this;

    data = new Buffer(data);
    // Append CRC
    var crc = calcCrc(data);
    var crcBuf = new Buffer(2);

    crcBuf.writeUInt16LE(crc, 0, 2);

    var buffer = Buffer.concat([data, crcBuf]);

    // Convert to Slip
    var slipData = Slip.generator(buffer);

    self.writeBuffer.push(slipData);
    self.writeNow();
};

SerialTransport.prototype.writeNow = function()
{
    var self = this;

    // Nothing to do here
    if(self.writeBuffer.length <= 0) return;
    // We are busy, do nothing
    if(self.writing) return;
    self.writing = true;

    // do nothing if we are in fake mode
    if(self.fake) { self.writing = false; return; }

    self.serialPort.drain(function()
        {
            var data = self.writeBuffer.shift();
            self.serialPort.write(data);

            //if(config.debug) console.log("Sending:", data);

            self.writing = false;
            if(self.writeBuffer.length > 0) self.writeNow();
        });
};

module.exports = SerialTransport;