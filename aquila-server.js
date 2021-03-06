#!/usr/bin/env node
"use strict";

// server.js

// set up ======================================================================
// get all the tools we need
var express = require("express"),
	bodyParser = require("body-parser"),
	methodOverride = require("method-override"),
	mongoose = require("mongoose"),
	socket = require("socket.io"),
	passport = require("passport"),
	cors = require("cors"),
	morgan = require("morgan"),
	configManager = require("./configManager");

var argv = require("minimist")(process.argv.slice(2));
var argHelp = "Use: aquila-server <options>\nOptions:\n\t--verbose\tDisplay verbose messages.\n\t--help\t\tDisplay this help text.\n\t--ssl\t\tStart with SSL.\n";

// Display Help text on --help option
if(argv.help)
{
	console.log(argHelp);
	process.exit();
}

var flash 	 		 = require('connect-flash');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');

// configuration ===============================================================
var configDB = require(configManager.databasePath);
var serverConfig = require(configManager.serverPath);
var port = process.env.PORT || serverConfig.port;
var useSSL = argv.ssl || serverConfig.ssl;
require('./config/passport')(passport); // pass passport for configuration

// SSL
if(useSSL)
{
	// For SSL support
	var https = require("https");
	var fs = require("fs");
	var keyFile = configManager.rsaKeyPath;
	var certFile = configManager.sslCertPath;
	var sslConfig = {
		key: fs.readFileSync(keyFile),
		cert: fs.readFileSync(certFile)
	};
}

var app = express();

// Middlewares

// Allow  CORS for client apps
app.use(cors());

// Verbose requests:
if(argv.verbose) app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// required for passport
var tokenConfig = require(configManager.tokenPath);
app.use(session({ secret: tokenConfig.secret, resave: true, saveUninitialized: true })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

app.use(methodOverride());
app.use(express.static(__dirname + "/apps"));
app.set("views", __dirname + "/apps");
app.engine("html", require("ejs").renderFile);
app.set('view engine', 'ejs'); // set up ejs for templating

// Will try to connect 60 times (useful for when mongo is still starting)
var mongoConnectRetries = 60;

function connectMongo()
{
	mongoose.connect(configDB.url, function(err, res)
		{
			if(err)
			{
				mongoConnectRetries--;
				// check retries remaining
				if(mongoConnectRetries === 0)
				{
					console.log("ERROR connecting to database, make sure that mongodb is installed and running or try resetting the database.");
					return process.exit(1);
				}
				// Retry in 2 seconds
				return setTimeout(function()
					{
						// Retry
						console.log("    Database not ready, retrying connection...");
						connectMongo();
					}, 2000);
			}
			// On success, continue app startup
			onMongoConnect();
		});
};

function onMongoConnect()
{
  console.log("Connected to Database");

  // routes ======================================================================
	// Routers
	var router = express.Router();

	// Main app route
	router.get("/", function(req, res)
	{
		res.render("main/index.html");
	});

	app.use(router);
	// Load API routes passing app.
	require("./api/routes")(app, passport);
	// Load Admin routes
	require("./admin/routes")(app, passport);

	// initialize Aquila protocol =================================================
  var deviceManager = require("./api/controllers/deviceManager");

	// Don't listen until deviceManager is ready:
	var onReady = function()
	{
		// Discover nearby devices
		deviceManager.discover();

		// Init config
		require("./api/controllers/config").init();

		// launch server ==========================================================
		var io = null;
		if(useSSL)
		{
			var server = https.createServer(sslConfig, app);
			io = socket.listen(server);
			server.listen(port, function()
			{
				console.log("Aquila server running on https://localhost:" + port);
			});
		}
		else
		{
			io = socket.listen(app.listen(port, function()
			{
				console.log("Aquila server running on http://localhost:" + port);
			}));
		}

		// Socket configuration
		require("./api/sockets")(io, passport, deviceManager);
	};

	if(deviceManager.ready) onReady();
	else deviceManager.on("ready", onReady);
};

connectMongo();
