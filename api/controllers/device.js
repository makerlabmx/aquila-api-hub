// api/controllers/device.js

var mongoose = require("mongoose");
var Device = mongoose.model("Device");
var deviceManager = require("./deviceManager");
var validator = require("validator");

var queryFields = "-_fetchComplete -_nActions -_nEvents -_nInteractions -_maxInteractions -__v -events._id -actions._id";

// GET - List all devices
exports.findAllDevices = function(req, res)
{
	Device.find(req.query, queryFields, function(err, devices)
	{
		if(err) res.send(500, err.message);

		res.status(200).jsonp(devices);
	});
	
};

// GET - retrieve a device
exports.findById = function(req, res)
{
	Device.findById(req.params.id, queryFields, function(err, device)
		{
			if(err) return res.send(500, err.message);

			res.status(200).jsonp(device);
		});
};

// PUT - Update customizable details (currently only name)
exports.updateDevice = function(req, res)
{
	Device.findById(req.params.id, queryFields, function(err, device)
	{
		if(err) return res.send(500, err.message);
		if(!device) return res.send(404, "Invalid device id");
		if(!req.body.name || typeof(req.body.name) !== "string") return res.send(404, "Invalid device name");
		device.name = req.body.name;

		device.save(function(err)
			{
				if(err) return res.send(500, err.message);
				res.status(201).jsonp(device);
			});
	});
};

// GET - Execute an action with optional param
exports.deviceAction = function(req, res)
{
	Device.findById(req.params.id, function(err, device)
	{
		if(err) return res.send(500, err.message);
		if(!device) return res.send(404, "Invalid device id");
		
		//console.log("GET /api/devices/" + req.params.id + "/action/" + req.params.action + "/" + req.params.param);

		if(err) return res.send(500, err.message);
		if(!validator.isInt(req.params.action)) return res.send(500);
		if(req.params.param && !validator.isInt(req.params.param)) return res.send(500);
		var action = parseInt(req.params.action);
		var param = null;
		if(req.params.param) param = parseInt(req.params.param);
		if(!( 	action >= 0 &&
				action <= 255)) return res.send(500);
		if(param !== null  && !(param >= 0 && param <= 255)) return res.send(500);

		deviceManager.requestAction(device.shortAddress, action, param);
		res.status(204).send();
	});
};
