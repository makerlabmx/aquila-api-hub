// api/routes.js

var express = express = require("express");
var mongoose = require("mongoose");

module.exports = function(app)
{
	// Import Models and Controllers
	var DeviceModel = require("./models/device").Device(app, mongoose);
	var InteractionModel = require("./models/interaction").Interaction(app, mongoose);
	var ConfigModel = require("./models/config")(app, mongoose);
	var DeviceCtrl = require("./controllers/device");
	var ConfigCtrl = require("./controllers/config");
	var InteractionCtrl = require("./controllers/interaction");

	var apiRouter = express.Router();

	// API:
	// Devices
	apiRouter.route("/devices")
		.get(DeviceCtrl.findAllDevices);

	apiRouter.route("/devices/:id")
		.get(DeviceCtrl.findById)
		.put(DeviceCtrl.updateDevice);

	apiRouter.route("/devices/:id/action/:action/:param?")
		.get(DeviceCtrl.deviceAction);

	// Interactions
	apiRouter.route("/interactions")
		.get(InteractionCtrl.findAllInteractions)
		.post(InteractionCtrl.addInteraction);

	apiRouter.route("/interactions/:id")
		.get(InteractionCtrl.findById)
		.put(InteractionCtrl.updateInteraction)
		.delete(InteractionCtrl.deleteInteraction);

	// Utils
	apiRouter.route("/pan")
		.get(ConfigCtrl.getPan)
		.post(ConfigCtrl.setPan);

	apiRouter.route("/discover")
		.get(ConfigCtrl.discover);

	apiRouter.route("/reload")
		.get(ConfigCtrl.reload);

	// Make app use these routes
	app.use("/api", apiRouter);

};