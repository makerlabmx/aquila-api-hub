// api/controllers/device.js

var mongoose = require("mongoose");
var Device = mongoose.model("Device");
var deviceManager = require("./deviceManager");
var validator = require("validator");
var services = require("./../lib/services");

var queryFields = "-_fetchComplete -_nActions -_nEvents -_nInteractions -_maxInteractions -__v -events._id -actions._id -_retriesInactive -_waitingRefresh -_retriesFetch";

// GET - List all devices
exports.findAllDevices = function(req, res)
{
	Device.find(req.query, queryFields, function(err, devices)
	{
		if(err) res.status(500).send(err.message);

		res.status(200).jsonp(devices);
	});

};

// GET - retrieve a device
exports.findById = function(req, res)
{
	Device.findById(req.params.id, queryFields, function(err, device)
		{
			if(err) return res.status(500).send(err.message);

			res.status(200).jsonp(device);
		});
};

// PUT - Update customizable details (currently only name)
exports.updateDevice = function(req, res)
{
	Device.findById(req.params.id, queryFields, function(err, device)
	{
		if(err) return res.status(500).send(err.message);
		if(!device) return res.status(404).send("Invalid device id");
		if(req.body.name)
		{
			if(typeof(req.body.name) !== "string") return res.status(404).send("Invalid device name");
			device.name = req.body.name;
		}
		if(req.body.icon)
		{
			if(typeof(req.body.icon) !== "string") return res.status(404).send("Invalid device icon");
			device.icon = req.body.icon;
		}

		device.save(function(err)
			{
				if(err) return res.status(500).send(err.message);
				res.status(201).jsonp(device);
			});
	});
};

// GET - Execute an action with optional param
exports.deviceAction = function(req, res)
{
	Device.findById(req.params.id, function(err, device)
	{
		if(err) return res.status(500).send(err.message);
		if(!device) return res.status(404).send("Invalid device id");

		if(err) return res.status(500).send(err.message);
		if(!validator.isInt(req.params.action)) return res.status(500).send();
		if(req.params.param && !validator.isInt(req.params.param)) return res.status(500).send();
		var action = parseInt(req.params.action);
		var param = null;
		if(req.params.param) param = parseInt(req.params.param);
		if(!( 	action >= 0 &&
				action <= 255)) return res.status(500).send();
		if(param !== null  && !(param >= 0 && param <= 255)) return res.status(500).send();

		deviceManager.requestAction(device.shortAddress, action, param);
		res.status(204).send();
	});
};

var deviceService = function(method, req, res)
{
	Device.findById(req.params.id, function(err, device)
	{
		if(err) return res.status(500).send(err.message);
		if(!device) return res.status(404).send("Invalid device id");

		console.log(req.params.service);

		services.request(device.shortAddress, method, req.params.service, function(err, srcAddr, status, data)
		{
			console.log(status, data);
			if(err) return res.status(500).send(err.message);
			if(status === services.R200) return res.status(200).type("application/json").send(data);
			if(status === services.R404) return res.status(404).send("Service not found in device");
			if(status === services.R405) return res.status(405).send("Method not allowed in device");
			if(status === services.R408) return res.status(408).send("Device Timeout");
			if(status === services.R500) return res.status(500).send("Device Error")
		}, req.body);
	});
};

exports.deviceServiceGet = function(req, res)
{
	deviceService(services.GET, req, res);
};

exports.deviceServicePost = function(req, res)
{
	deviceService(services.POST, req, res);
};

exports.deviceServicePut = function(req, res)
{
	deviceService(services.PUT, req, res);
};

exports.deviceServiceDelete = function(req, res)
{
	deviceService(services.DELETE, req, res);
};
