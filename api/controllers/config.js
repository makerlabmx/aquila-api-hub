// api/controllers/config.js

var mongoose = require("mongoose");
var Config = mongoose.model("Config");
var Device = mongoose.model("Device");
var Interaction = mongoose.model("Interaction");
var deviceManager = require("./deviceManager");
var deviceCtrl = require("./device");
var mesh = require("./../lib/mesh");

var DEFAULT_PAN = 0xCA5A;

var queryFields = "-__v";

// Initializes config, default PAN, etc.
exports.init = function()
{
	Config.findOne(function(err, config)
		{
			if(err) return console.log("Error: ", err.message);

			// if there is no configm create default
			if(!config)
			{
				var newConfig = new Config({
					pan: DEFAULT_PAN,
					secEnabled: false,
					secKey: new Buffer([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
					showDisconnected: true,
					language: "en"
				});

				newConfig.save(function(err, newConfig)
					{
						if(err) return console.log("Error: ", err.message);
						//console.log("newConfig saved", newConfig);
						deviceManager.setPAN(newConfig.pan);
					});
			}
			else
			{
				deviceManager.setPAN(config.pan);
				mesh.setSecurityKey(config.secKey);
				mesh.setSecurityEnabled(config.secEnabled);
			}
		});
};

// GET - Retrieve current PAN
exports.getPan = function(req, res)
{
	Config.findOne(null, queryFields, function(err, config)
		{
			if(err) return res.status(500).send(err.message);

			res.status(200).jsonp({ pan: config.pan });
		});
};

// POST - Set current PAN
exports.setPan = function(req, res)
{
	if(!(typeof(req.body.pan) === "number" && req.body.pan >= 0 && req.body.pan <= 0xFFFF))
	{ return res.status(500).send("Invalid PAN"); }

	Config.findOne(null, queryFields, function(err, config)
		{
			if(err) return res.status(500).send(err.message);
			config.pan = req.body.pan;

			config.save(function(err)
				{
					if(err) return res.status(500).send(err.message);
					deviceManager.setPAN(config.pan);
					res.status(200).jsonp(config);
				});
		});
};

// GET - Get mesh security status
exports.getSec = function(req, res)
{
	Config.findOne(null, queryFields, function(err, config)
		{
			if(err) return res.status(500).send(err.message);

			res.status(200).jsonp({ secEnabled: config.secEnabled, secKey: config.secKey });
		});
};

// POST - Set mesh security status
exports.setSec = function(req, res)
{

	Config.findOne(null, queryFields, function(err, config)
		{
			if(err) return res.status(500).send(err.message);
			// validate
			if(typeof(req.body.secEnabled) === "boolean") { config.secEnabled = req.body.secEnabled; }
			if(req.body.secKey && req.body.secKey.length === 16) config.secKey = new Buffer(req.body.secKey);

			config.save(function(err)
				{
					if(err) return res.status(500).send(err.message);
					mesh.setSecurityKey(config.secKey);
					mesh.setSecurityEnabled(config.secEnabled);
					res.status(200).jsonp(config);
				});
		});
};

// GET - Get Whole Config
exports.getConfig = function(req, res)
{
	Config.findOne(null, queryFields, function(err, config)
	{
		if(err) return res.status(500).send(err.message);

		res.status(200).jsonp(config);
	});
};

// POST - Set Whole Config
exports.setConfig = function(req, res)
{

	Config.findOne(null, queryFields, function(err, config)
	{
		if(err) return res.status(500).send(err.message);
		// validate
		if(typeof(req.body.secEnabled) === "boolean") { config.secEnabled = req.body.secEnabled; }
		if(req.body.secKey && req.body.secKey.length === 16) config.secKey = new Buffer(req.body.secKey);
		if(typeof(req.body.pan) === "number" && req.body.pan >= 0 && req.body.pan <= 0xFFFF)
		{ config.pan = req.body.pan; }
		if(typeof(req.body.showDisconnected) === "boolean") { config.showDisconnected = req.body.showDisconnected; }
		if(typeof(req.body.language) === "string") { config.language = req.body.language; }

		config.save(function(err)
		{
			if(err) return res.status(500).send(err.message);
			deviceManager.setPAN(config.pan);
			mesh.setSecurityKey(config.secKey);
			mesh.setSecurityEnabled(config.secEnabled);
			res.status(200).jsonp(config);
		});
	});
};


// GET - start discovering devices
exports.discover = function(req, res)
{
	//console.log("Discovering");

	deviceManager.discover(function()
		{
			deviceCtrl.findAllDevices(req, res);
		});
};

// GET - reload devices
exports.reload = function(req, res)
{
	//console.log("Reloading");

	Device.remove({}, function(err)
		{
			Interaction.remove({}, function(err)
			{
				if(err) console.log(err);
			});
			if(err) return res.status(500).send(err.message);
			deviceManager.discover(function()
				{
					deviceCtrl.findAllDevices(req, res);
				});

		});
};
