"use strict";

// api/routes.js

var express = require("express");
var mongoose = require("mongoose");
var expressJwt = require("express-jwt");
var configManager = require("./../configManager");
var tokenConfig = require(configManager.tokenPath);
var TokenCtrl = require("./controllers/token");
var IpCtrl = require("./controllers/ip");
var VerCtrl = require("./controllers/version.js");

module.exports = function(app, passport)
{
	// Import Models and Controllers
	var DeviceModel = require("./models/device").Device(app, mongoose);
	var InteractionModel = require("./models/interaction").Interaction(app, mongoose);
	var TaskModel = require("./models/task")(app, mongoose);
	var ConfigModel = require("./models/config")(app, mongoose);
	var DeviceCtrl = require("./controllers/device");
	var ConfigCtrl = require("./controllers/config");
	var InteractionCtrl = require("./controllers/interaction");
	var TaskCtrl = require("./controllers/task");
	var WSerialCtrl = require("./controllers/wserial");
  var TokenModel = require("./models/token")(app, mongoose);
  var AuthCtrl = require("./controllers/auth.js");

	var apiRouter = express.Router();
	//apiRouter.use(passport.authenticate('basic', { session: false }));
	apiRouter.use(expressJwt({secret: tokenConfig.secret}));

	// Authentication
	app.route("/api/token")
		.post(TokenCtrl.retrieveToken);

  // --------------------------
  // New token system
  app.route("/api/tokens")
    .get(AuthCtrl.findAllTokens)
    .post(AuthCtrl.createToken);

  app.route("/api/tokens/:id")
    .get(AuthCtrl.findById)
    .put(AuthCtrl.editTokenById)
    .delete(AuthCtrl.deleteToken);

  //---------------------------

	// API:
	// Devices
	apiRouter.route("/devices")
		.get(DeviceCtrl.findAllDevices);

	apiRouter.route("/devices/:id")
		.get(DeviceCtrl.findById)
		.put(DeviceCtrl.updateDevice)
		.delete(DeviceCtrl.forgetDevice);

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

	// Tasks
	apiRouter.route("/tasks")
		.get(TaskCtrl.findAllTasks)
		.post(TaskCtrl.addTask);

	apiRouter.route("/tasks/:id")
		.get(TaskCtrl.findById)
		.put(TaskCtrl.updateTask)
		.delete(TaskCtrl.deleteTask);

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

	// Version service
	apiRouter.route("/version")
		.get(VerCtrl.getVersion);

	// Make app use these routes
	app.use("/api", apiRouter);

};
