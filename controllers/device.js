var mongoose = require("mongoose");
var Device = mongoose.model("Device");
var deviceManager = require("./deviceManager");
var validator = require("validator");


// GET - List all devices
exports.findAllDevices = function(req, res)
{
	Device.find(function(err, devices)
		{
			if(err) res.send(500, err.message);

			console.log("GET /api/devices");
			res.status(200).jsonp(devices);
		});
};

// GET - retrieve a device
exports.findById = function(req, res)
{
	Device.findById(req.params.id, function(err, device)
		{
			if(err) return res.send(500, err.message);

			console.log("GET /api/devices/" + req.params.id);
			res.status(200).jsonp(device);
		});
};

// PUT - Update customizable details (currently only name)
exports.updateDevice = function(req, res)
{
	Device.findById(req.params.id, function(err, device)
	{
		device.name = req.body.name;

		device.save(function(err)
			{
				if(err) return res.send(500, err.message);
				res.status(200).jsonp(device);
			});
	});
};

// GET - Execute an action with optional param
exports.deviceAction = function(req, res)
{
	console.log(req.params);
	Device.findById(req.params.id, function(err, device)
	{
		console.log("GET /api/devices/" + req.params.id + "/action/" + req.params.action + "/" + req.params.param);

		if(err) return res.send(500, err.message);
		if(!validator.isInt(req.params.action)) return res.send(500);
		if(req.params.param && !validator.isInt(req.params.param)) return res.send(500);
		var action = parseInt(req.params.action);
		var param = null;
		if(req.params.param) param = parseInt(req.params.param);
		if(!( 	action >= 0 &&
				action <= 255)) return res.send(500);
		if(param  && !(param >= 0 && param <= 255)) return res.send(500);

		deviceManager.requestAction(device.address, action, param);
		res.status(200).send("Ok");
	});
};
