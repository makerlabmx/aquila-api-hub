// api/models/task.js

var mongoose = require("mongoose"),
	Schema   = mongoose.Schema;
var schedule = require("node-schedule");

var taskSchema = mongoose.Schema(
	{
		// Device id
		device: String,
		action: Number,
		param: Number,
		dateRule: Date,
		recurrenceRule: {
			year: Number,
			month: Number,
			date: Number,
			dayOfWeek: Number,
			hour: Number,
			minute: Number,
			second: Number
		}
	});

module.exports = mongoose.model("Task", taskSchema);
