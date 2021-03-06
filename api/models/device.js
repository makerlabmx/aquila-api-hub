"use strict";

// api/models/device.js

var mongoose = require("mongoose"),
	Schema   = mongoose.Schema;
	//var interactionSchema = require("./interaction").Schema;

var actionSchema = new Schema(
	{
		n: Number,
		name: String
	});

var eventSchema = new Schema(
	{
		n: Number,
		name: String
	});

var deviceSchema = new Schema(
	{
		_id: String,
		address: Buffer,
		shortAddress: Number,
		class: String,
		name: String,
		_defaultName: String,
		active: Boolean,
		actions: [actionSchema],
		events: [eventSchema],
		_fetchComplete: Boolean,
		_nActions: Number,
		_nEvents: Number,
		_nInteractions: Number,
		_maxInteractions: Number,
		_retriesInactive: Number,
		_waitingRefresh: Boolean,
		_retriesFetch: Number,
		icon: String
		//_interactions: [interactionSchema]
	});

module.exports = {
					Device: mongoose.model("Device", deviceSchema),
					Action: mongoose.model("Action", actionSchema),
					Event: mongoose.model("Event", eventSchema)
				};
