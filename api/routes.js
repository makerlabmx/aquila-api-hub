// api/routes.js

var express = express = require("express");
var mongoose = require("mongoose");
var expressJwt = require("express-jwt");
var tokenConfig = require("./../config/token");
var TokenCtrl = require("./controllers/token");
var IpCtrl = require("./controllers/ip");

module.exports = function(app, passport)
{
	// Import Models and Controllers
	var DeviceModel = require("./models/device").Device(app, mongoose);
	var InteractionModel = require("./models/interaction").Interaction(app, mongoose);
	var ConfigModel = require("./models/config")(app, mongoose);
	var DeviceCtrl = require("./controllers/device");
	var ConfigCtrl = require("./controllers/config");
	var InteractionCtrl = require("./controllers/interaction");
	var WSerialCtrl = require("./controllers/wserial");

	var apiRouter = express.Router();
	//apiRouter.use(passport.authenticate('basic', { session: false }));
	apiRouter.use(expressJwt({secret: tokenConfig.secret}));

	// Authentication
	app.route("/api/token")
		.post(TokenCtrl.retrieveToken);

	// API:
	// Devices
	apiRouter.route("/devices")
		.get(DeviceCtrl.findAllDevices);

	apiRouter.route("/devices/:id")
		.get(DeviceCtrl.findById)
		.put(DeviceCtrl.updateDevice);

	apiRouter.route("/devices/:id/action/:action/:param?")
		.get(DeviceCtrl.deviceAction);

	apiRouter.route("/devices/:id/service/:service")
		.get(DeviceCtrl.deviceServiceGet)
		.post(DeviceCtrl.deviceServicePost)
		.put(DeviceCtrl.deviceServicePut)
		.delete(DeviceCtrl.deviceServiceDelete);

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

	apiRouter.route("/security")
		.get(ConfigCtrl.getSec)
		.post(ConfigCtrl.setSec);

	apiRouter.route("/config")
		.get(ConfigCtrl.getConfig)
		.post(ConfigCtrl.setConfig);

	apiRouter.route("/discover")
		.get(ConfigCtrl.discover);

	apiRouter.route("/reload")
		.get(ConfigCtrl.reload);

	// WSerial
	apiRouter.route("/wserial")
		.post(WSerialCtrl.sendData);

	// Server ip service
	apiRouter.route("/ip")
		.get(IpCtrl.getIp);

	// Make app use these routes
	app.use("/api", apiRouter);

};
