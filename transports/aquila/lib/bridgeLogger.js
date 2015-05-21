"use strict";

var path = require("path");
var configManager = require("./../../../configManager");
var logPath = path.join(configManager.logPath, "bridge.log");

var winston = require("winston");

var logger = new (winston.Logger)(
	{
		transports: [
			new (winston.transports.File)({
				name: "bridgelog",
				filename: logPath
			})
		]
	});


module.exports = logger;