"use strict";

// api/controllers/interaction.js

var mongoose = require("mongoose");
var Interaction = mongoose.model("Interaction");
var Device = mongoose.model("Device");
var deviceManager = require("./deviceManager");
var async = require("async");

var devQueryFields = "-_fetchComplete -_nActions -_nEvents -_nInteractions -_maxInteractions -__v -events._id -actions._id";
var interQueryFields = "-__v";

/*
	New interaction object format;
	{
		_id: id
		event_device: Device,
		event: Number,
		action_device: Device,
		action: Number,
		param: Number,
		_n: Number
	}

	*action_device is always known, because is the one that has the interaction
	in memory, however, event_device could be unknown, in this case we pass an
	empty device with just its address.
*/

// modifies interaction for the new format.
// callback(err, interaction)
var formatInteraction = function(interaction, callback)
{
	if(!interaction) return callback(null, interaction);
	var newInteraction = {
		_id: interaction._id,
		event_device: null,
		event: interaction.event,
		action_device: null,
		action: interaction.action,
		param: interaction.param,
		_n: interaction.number
	};

	Device.findOne({"address": interaction.action_address}, devQueryFields, function(err, action_device)
		{
			//console.log(action_device);
			if(err) return callback(err);
			if(!action_device) return callback(new Error("Couldn't get action_device with address " + interaction.action_address));

			newInteraction.action_device = action_device;

			Device.findOne({"address": interaction.event_address}, devQueryFields, function(err, event_device)
				{
					if(err) return callback(err);
					//console.log(event_device);

					if(!event_device)
					{
						event_device = {
							_id: null,
							address: interaction.event_address,
							class: null,
							name: null,
							_defaultName: null,
							active: false,
							actions: [],
							events: []
						};
					}

					newInteraction.event_device = event_device;
					return callback(null, newInteraction);

				});
		});
};

var formatInteractions = function(interactions, callback)
{
	async.mapSeries(interactions, formatInteraction, function(err, results)
		{
			if(err) return callback(err);
			callback(null, results);
		});
};

// GET - List all interactions
exports.findAllInteractions = function(req, res)
{
	Interaction.find(req.query, interQueryFields, function(err, interactions)
		{
			if(err) return res.status(500).send(err.message);

			formatInteractions(interactions, function(err, fmtInteractions)
				{
					if(err) return res.status(500).send(err.message);
					res.status(200).jsonp(fmtInteractions);
				});
		});
};

// POST - Add new interaction
exports.addInteraction = function(req, res)
{
	var self = this;

	var newInteraction = new Interaction(
	{
		event_address: 	req.body.event_address,
		event: 			req.body.event,
		action_address: req.body.action_address,
		action: 		req.body.action,
		param: 			req.body.param
	});

	Device.findOne({"address": req.body.action_address}, function(err, device)
		{
			if(err) return res.status(500).send(err.message);
			if(!device) return res.sendStatus(500);

			deviceManager.addInteraction(device, newInteraction, function(err)
				{
					if(err) return res.status(500).send(err.message);
					exports.findAllInteractions(req, res);
				});
		});
};

// GET - retrieve an interaction
exports.findById = function(req, res)
{
	Interaction.findById(req.params.id, interQueryFields, function(err, interaction)
		{
			if(err) return res.status(500).send(err.message);

			formatInteraction(interaction, function(err, fmtInteraction)
				{
					if(err) return res.status(500).send(err.message);
					res.status(200).jsonp(fmtInteraction);
				});
		});
};

// PUT - Modify existing interaction
exports.updateInteraction = function(req, res)
{
	var self = this;
	var newInteraction = new Interaction(
	{
		event_address: 	req.body.event_address,
		event: 			req.body.event,
		action_address: req.body.action_address,
		action: 		req.body.action,
		param: 			req.body.param
	});

	Interaction.findById(req.params.id, function(err, interaction)
	{
		if(err) return res.status(500).send(err.message);
		if(!interaction) return res.sendStatus(500);

		Device.findOne({"address": interaction.action_address}, function(err, device)
		{
			if(err) return res.status(500).send(err.message);
			try{
			deviceManager.editInteraction(device, interaction._n, newInteraction, function(err)
				{
					if(err) return res.status(500).send(err.message);
					exports.findAllInteractions(req, res);
				});
			}catch(err){return res.status(500).send(err.message);}
			/*interaction.event_address = req.body.event_address;
			interaction.event = req.body.event;
			interaction.action_address = req.body.action_address;
			interaction.action = req.body.action;
			interaction.param = req.body.param;

			interaction.save(function(err)
				{
					if(err) return res.status(500).send(err.message);
					res.status(200).jsonp(interaction);
				});*/
		});
	});
};

// DELETE - remove interaction
exports.deleteInteraction = function(req, res)
{
	Interaction.findById(req.params.id, function(err, interaction)
		{
			if(err) return res.status(500).send(err.message);
			if(!interaction) return res.sendStatus(500);

			Device.findOne({"address": interaction.action_address}, function(err, device)
				{
					deviceManager.removeInteraction(device, interaction._n, function(err)
						{
							if(err) return res.status(500).send(err.message);
							exports.findAllInteractions(req, res);
						});
				});
			/*interaction.remove(function(err)
				{
					if(err) return res.status(500).send(err.message);
					res.status(200).send();
				});*/
		});
};
