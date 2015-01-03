// api/models/config.js

var mongoose = require('mongoose'),
	Schema   = mongoose.Schema;

var configSchema = new Schema(
	{
		pan: Number,
		channel: Number,
		secEnabled: Boolean,
		secKey: Buffer,
		showDisconnected: Boolean,
		language: String
	});

module.exports = mongoose.model('Config', configSchema);
