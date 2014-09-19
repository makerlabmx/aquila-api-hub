var mongoose = require("mongoose"),
	Schema   = mongoose.Schema;

var interactionSchema = new Schema(
	{
		event_address: Buffer,
		event: Number,
		action_address: Buffer,
		action: Number,
		param: Number,
		_n: Number
	});

interactionSchema.methods.fromBuffer = function(raw)
{
	// parse entry
	console.log("interaction fromBuffer: ", this);

	this.param = Boolean(raw.data[0]);
	this.event = raw.data[1];
	this.event_address = raw.data.slice(2, 10);
	this.action = raw.data[10];
	if(this.param) this.param = raw.data[11];
};

interactionSchema.methods.toBuffer = function()
{
	var buf = new Buffer(12);
	buf[0] = Boolean(this.param);
	buf[1] = this.event;
	var event_address = this.event_address;
	event_address.copy(buf, 2);
	buf[10] = this.action;
	buf[11] = this.param;

	return buf;
};

module.exports = { 
					Interaction: mongoose.model("Interaction", interactionSchema),
					Schema: interactionSchema
				};