var mongoose = require("mongoose");
var Interaction = mongoose.model("Interaction");
var Device = mongoose.model("Device");
var deviceManager = require("./deviceManager");

// GET - List all interactions
exports.findAllInteractions = function(req, res)
{
	console.log(req.query);
	Interaction.find(req.query, function(err, interactions)
		{
			if(err) res.send(500, err.message);

			console.log("GET /api/interactions");
			res.status(200).jsonp(interactions);
		});
};

// POST - Add new interaction
exports.addInteraction = function(req, res)
{
	var self = this;
	console.log("POST interaction");
	console.log(req.body);

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
			console.log(device);
			if(err) return res.send(500, err.message);
			deviceManager.addInteraction(device, newInteraction, function(err)
				{
					if(err) return res.send(500, err.message);
					exports.findAllInteractions(req, res);
				});
		});

	/*
	interaction.save(function(err, interaction)
		{
			if(err) return res.send(500, err.message);
			res.status(200).jsonp(interaction);
		});
	*/
};

// GET - retrieve an interaction
exports.findById = function(req, res)
{
	Interaction.findById(req.params.id, function(err, interaction)
		{
			if(err) return res.send(500, err.message);

			console.log("GET /api/interactions/" + req.params.id);
			res.status(200).jsonp(interaction);
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
		Device.findOne({"address": interaction.action_address}, function(err, device)
		{
			if(err) return res.send(500, err.message);
			deviceManager.editInteraction(device, interaction._n, newInteraction, function(err)
				{
					if(err) return res.send(500, err.message);
					exports.findAllInteractions(req, res);
				});
			/*interaction.event_address = req.body.event_address;
			interaction.event = req.body.event;
			interaction.action_address = req.body.action_address;
			interaction.action = req.body.action;
			interaction.param = req.body.param;

			interaction.save(function(err)
				{
					if(err) return res.send(500, err.message);
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
			Device.findOne({"address": interaction.action_address}, function(err, device)
				{
					deviceManager.removeInteraction(device, interaction._n, function(err)
						{
							if(err) return res.send(500, err.message);
							exports.findAllInteractions(req, res);
						});
				});
			/*interaction.remove(function(err)
				{
					if(err) return res.send(500, err.message);
					res.status(200).send();
				});*/
		});
};
