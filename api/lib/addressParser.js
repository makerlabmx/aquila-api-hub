var buffertools = require("buffertools");
/*
	Parses protocol addresses from string to Buffer and backwards.
	Address formats:
		As string:
			Long Address: "01:02:23:A2:B5:C4:2A:5B"
			Short Address(broadcast): "FF:FF"
		As array:
			Long Address: [0x01, 0x02, 0x23, 0xA2, 0xB5, 0xC4, 0x2A, 0x5b]
			Short Address: [0xFF, 0xFF]
*/

var AddressParser = function()
{
	var self = this;
};

AddressParser.prototype.isAddress = function(address)
{
	if(typeof address === "string")
	{
		if(this.toBuffer(address) === false) return  false;
		else return true;
	}
	else
	{
		if(this.toString(address) === false) return false;
		return true;
	}
};

AddressParser.prototype.toBuffer = function(string)
{
	var array = string.split(":");
	var buffer, addrLen;
	if(array.length === 8) addrLen = 8;			// Long address
	else if(array.length === 2) addrLen = 2;	// Short address
	else return false;
		
	buffer = new Buffer(addrLen);
	for(var n = 0; n < array.length; n++)
	{
		var number;
		if(array[n] === "") number = 0;
		else number = parseInt(array[n], 16);
		if(isNaN(number) || number > 255 || number < 0) return false;

		buffer[n] = number;
	}

	return buffer;
};

AddressParser.prototype.toString = function(array)
{
	var string = "";
	if(!array) return string;
	if(array.length === 8 || array.length === 2)
	{
		for(var n = 0; n < array.length; n++)
		{
			if(isNaN(array[n]) || array[n] > 255 || array[n] < 0) return false;
			if(n !== 0) string += ":";
			string += array[n].toString(16).toUpperCase();
		}
	}
	else return false;

	return string;
};

AddressParser.prototype.compare = function(a, b)
{
	if(typeof a === "string") a = this.toBuffer(a);
	if(typeof b === "string") b = this.toBuffer(b);

	try
	{
		if(buffertools.compare(a, b) === 0) return true;
	}
	catch(err){}
	return false;
};

var addressParser = new AddressParser();

module.exports = addressParser;