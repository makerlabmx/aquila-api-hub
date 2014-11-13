/*
 *	ProtoPacket
 *	Protocol Packet representation
 *	Author: Rodrigo Méndez Gamboa, rmendez@makerlab.mx
 */

var ProtoControl = function()
{
	this.commandType = ProtoPacket.CMD_ACK;
	this.hasParam = false;
	this.hasData = false;
};

ProtoControl.prototype.fromRaw = function(raw)
{
	this.commandType = raw & 0x07;
	this.hasParam = (raw >>> 3) & 0x01;
	this.hasData = (raw >>> 4) & 0x01;
};

ProtoControl.prototype.getRaw = function()
{
	var ctrl = (this.commandType & 0x07) | (this.hasParam & 0x01) << 3 | (this.hasData & 0x01) << 4;
	var raw = new Buffer(1);
	raw.writeUInt8(ctrl, 0);
	return raw;
};

var ProtoMessage = function()
{
	this.version = new Buffer(1);
	this.version.writeUInt8(0x02, 0);
	this.control = new ProtoControl();
	this.command = new Buffer(0);
	this.param = new Buffer(0);
	this.data = new Buffer(0);
};

ProtoMessage.prototype.fromRaw = function(payload)
{
	if(!(payload instanceof Buffer)) payload = new Buffer(payload);

	this.version = payload.readUInt8(0);
	this.control.fromRaw(payload.readUInt8(1));

	var dataIndex = 2;	

	if(	this.control.commandType === ProtoPacket.CMD_ACTION ||
		this.control.commandType === ProtoPacket.CMD_GET    ||
		this.control.commandType === ProtoPacket.CMD_POST	||
		this.control.commandType === ProtoPacket.CMD_EVENT)
	{
		this.command = payload.slice(2,3);
		dataIndex++;
		if(this.control.hasParam)
		{
			this.param = payload.slice(3,4);
			dataIndex++;
		}
	}

	if(this.control.hasData)
	{
		this.data = payload.slice(dataIndex);
	}

};

ProtoMessage.prototype.getRaw = function()
{
	var raw = Buffer.concat([this.version,
							 this.control.getRaw(),
							 this.command,
							 this.param,
							 this.data
							 ]);

	return raw;
};

var ProtoPacket = function()
{
	this.srcAddr = 0xFFFF;
	this.destAddr = 0xFFFF;
	this.message = new ProtoMessage();
};

ProtoPacket.CMD_NACK 	= 0x00;
ProtoPacket.CMD_ACK 	= 0x01;
ProtoPacket.CMD_ACTION 	= 0x02;
ProtoPacket.CMD_GET 	= 0x03;
ProtoPacket.CMD_POST 	= 0x04;
ProtoPacket.CMD_CUSTOM 	= 0x05;
ProtoPacket.CMD_EVENT	= 0x06;

module.exports = ProtoPacket;