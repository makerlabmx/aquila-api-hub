var mongoose = require("mongoose");
var Config = mongoose.model("Config");
var Device = mongoose.model("Device");
var Interaction = mongoose.model("Interaction");
var deviceManager = require("./deviceManager");
var deviceCtrl = require("./device");

var DEFAULT_PAN = 0xCA5A;

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
					pan: DEFAULT_PAN
				});

				newConfig.save(function(err, newConfig)
					{
						if(err) return console.log("Error: ", err.message);
						console.log("newConfig saved", newConfig);
						deviceManager.setPAN(newConfig.pan);
					});
			}
			else
			{
				deviceManager.setPAN(config.pan);
			}
		});
};

// GET - Retrieve current PAN
exports.getPan = function(req, res)
{
	Config.findOne(function(err, config)
		{
			if(err) return res.send(500, err.message);

			console.log("GET /api/pan");
			res.status(200).jsonp(config);
		});
};

// POST - Set current PAN
exports.setPan = function(req, res)
{
	console.log("POST");
	console.log(req.body);

	if(!(typeof(req.body.pan) === "number" && req.body.pan >= 0 && req.body.pan <= 0xFFFF))
	{ return res.send(500, "Invalid PAN"); }

	Config.findOne(function(err, config)
		{
			config.pan = req.body.pan;

			config.save(function(err)
				{
					if(err) return res.send(500, err.message);
					deviceManager.setPAN(config.pan);
					res.status(200).jsonp(config);
				});
		});
};

// GET - start discovering devices
exports.discover = function(req, res)
{
	console.log("Discovering");

	deviceManager.discover(function()
		{
			deviceCtrl.findAllDevices(req, res);
		});
};

// GET - reload devices
exports.reload = function(req, res)
{
	console.log("Reloading");

	Device.remove({}, function(err)
		{
			Interaction.remove({}, function(err)
			{
				if(err) console.log(err);
			});
			if(err) return res.send(500, err.message);
			deviceManager.discover(function()
				{
					deviceCtrl.findAllDevices(req, res);
				});
			
		});
};