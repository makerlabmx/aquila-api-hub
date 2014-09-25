// api/models/config.js

var mongoose = require('mongoose'),
	Schema   = mongoose.Schema;

var configSchema = new Schema(
	{
		pan: Number
	});

module.exports = mongoose.model('Config', configSchema);