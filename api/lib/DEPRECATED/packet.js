/*
 *	802.15.4 Packet implementation
 *	Author: Rodrigo Méndez Gamboa, rmendez@makerlab.mx
 */

var FrameControl = function(raw)
{
	// default useful values
	this.srcAddrMode = Packet.ADDR_LONG;
	this.frameVersion = Packet.V2006;
	this.destAddrMode = Packet.ADDR_LONG;
	this.reserved = 0x00;
	this.panIdCompression = true;
	this.ackR = true;
	this.framePending = false;
	this.securityEnabled = false;
	this.frameType = Packet.FTYPE_DATA;

	if(raw) this.fromRaw(raw);
};

FrameControl.prototype.fromRaw = function(raw)
{
	// low byte of frame control
	this.frameType = raw[0] & 0x07;
	this.securityEnabled = Boolean( (raw[0] >>> 3) & 0x01 );
	this.framePending = Boolean( (raw[0] >>> 4) & 0x01 );
	this.ackR = (raw[0] >>> 5) & 0x01;
	this.panIdCompression = Boolean( (raw[0] >>> 6) & 0x01 );
	// high byte of frame control
	this.destAddrMode = (raw[1] >>> 2) & 0x03;
	this.frameVersion = (raw[1] >>> 4) & 0x03;
	this.srcAddrMode = (raw[1] >>> 6) & 0x03; 
};

FrameControl.prototype.getRaw = function()
{
	var raw = new Buffer(2);
	// low byte of frame control
	raw[0] = (this.frameType & 0x07) | (this.securityEnabled & 0x01) << 3 | (this.framePending & 0x01) << 4 
			| (this.ackR & 0x01) << 5 | (this.panIdCompression & 0x01) << 6;

	// high byte of frame control
	raw[1] = (this.destAddrMode & 0x03) << 2 | (this.frameVersion & 0x03) << 4 | (this.srcAddrMode & 0x03) << 6;

	return raw;
};

var SecurityHeader = function(raw)
{
	this.securityControl = new Buffer(0); // 1 if sec enabled
	this.frameCounter = new Buffer(0);	// 4 if sec enabled

	if(raw) this.fromRaw(raw);
};

SecurityHeader.prototype.fromRaw = function(raw)
{
	this.securityControl = raw.slice(0, 1);
	this.frameCounter = raw.slice(1);
};

SecurityHeader.prototype.getRaw = function()
{
	var raw = Buffer.concat([this.securityControl,
							 this.frameCounter]);
	return raw;
};

var Packet = function(data)
{
	this.frameControl = new FrameControl();
	this.sequenceNumber = new Buffer(1);
	this.sequenceNumber.writeUInt8(0x01, 0);
	this.destPan = new Buffer(2);
	this.destPan.writeUInt16LE(0xCA5A, 0);
	this.srcPan = new Buffer(0);
	this.destAddr = new Buffer(8);
	this.srcAddr = new Buffer(8);
	this.securityHeader = new SecurityHeader(); // 5 if sec enabled
	this.payload = new Buffer(0);	// max 95 if sec enabled
	this.MUI = new Buffer(0);	// 4 if sec enabled

	if(data) this.fromRaw(data);
};

// Constants:
// FrameControl Constants
// Frame types:
Packet.FTYPE_BEACON = 0x00;
Packet.FTYPE_DATA 	= 0x01;
Packet.FTYPE_ACK 	= 0x02;
Packet.FTYPE_MACCMD = 0x03;
// Dest and Src Addr modes:
Packet.ADDR_EMPTY = 0x00;
Packet.ADDR_SHORT = 0x02;
Packet.ADDR_LONG  = 0x03;
// Frame versions
Packet.V2003 = 0x00;
Packet.V2006 = 0x01;

// SecurityHeader Constants
// Default Security control:
Packet.SECCONTROL = 0x05;

Packet.prototype.fromRaw = function(raw)
{
	try
	{
		var totalLen = raw.length;

		this.frameControl.fromRaw(raw.slice(0, 2));

		// Currently we only support data frames
		if(this.frameControl.frameType !== Packet.FTYPE_DATA) return false;
		var secured = this.frameControl.securityEnabled;
		var panComp = this.frameControl.panIdCompression;
		var destAddrMode = this.frameControl.destAddrMode;
		var srcAddrMode = this.frameControl.srcAddrMode;

		var i = 2;
		var size = 8;

		this.sequenceNumber = raw.slice(i, i+1);
		i++;
		if(destAddrMode !== Packet.ADDR_EMPTY)
		{
			this.destPan = raw.slice(i, i+2);
			i += 2;

			if(destAddrMode === Packet.ADDR_LONG) size = 8;
			else size = 2;

			this.destAddr = raw.slice(i, i+size);
			i += size;
		}

		if(srcAddrMode !== Packet.ADDR_EMPTY)
		{
			if(!panComp)
			{
				this.srcPan = raw.slice(i, i+2);
				i += 2;
			}
			if(srcAddrMode === Packet.ADDR_LONG) size = 8;
			else size = 2;

			this.srcAddr = raw.slice(i, i+size);
			i += size;
		}

		if(secured)
		{
			this.securityHeader.fromRaw( raw.slice(i, i+5) );
			i += 5;

			this.payload = raw.slice(i, totalLen - 4);
			this.MUI = raw.slice(totalLen - 4);
		}
		else
		{
			this.payload = raw.slice(i);
		}
		
	}
	catch(err)
	{
		return false;
	}

};

Packet.prototype.getRaw = function()
{
	var raw = Buffer.concat([this.frameControl.getRaw(), 
							 this.sequenceNumber,
							 this.destPan,
							 this.destAddr,
							 this.srcPan,
							 this.srcAddr,
							 this.securityHeader.getRaw(),
							 this.payload,
							 this.MUI
							 ]);
	return raw;
};

module.exports = Packet;