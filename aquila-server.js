#! /usr/bin/env node
// server.js

// set up ======================================================================
// get all the tools we need
var express = require("express"),
	bodyParser = require("body-parser"),
	methodOverride = require("method-override"),
	mongoose = require("mongoose"),
	socket = require("socket.io"),
	toobusy = require("toobusy"),
	passport = require("passport"),
	morgan = require("morgan");

var argv = require("minimist")(process.argv.slice(2));
var argHelp = "Use: aquila-server <options>\nOptions:\n\t--verbose\tDisplay verbose messages.\n\t--help\t\tDisplay this help text.\n"

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
var configDB = require("./config/database.js");
var port = process.env.PORT || 8080;
require('./config/passport')(passport); // pass passport for configuration

var app = express();

// Middlewares
app.use(function(req, res, next)
	{
		// check if we're toobusy() - note, this call is extremely fast, and returns
		// state that is cached at a fixed interval
		if (toobusy()) { res.status(503).send("Server is busy right now, try again later."); console.log("Busy"); }
		else next();
	});

// Verbose requests:
if(argv.verbose) app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// required for passport
app.use(session({ secret: 'e8b4b052c308c3d5c4c943f9c7ac09d7', resave: true, saveUninitialized: true })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

app.use(methodOverride());
app.use(express.static(__dirname + "/apps"));
app.set("views", __dirname + "/apps");
app.engine("html", require("ejs").renderFile);
app.set('view engine', 'ejs'); // set up ejs for templating

mongoose.connect(configDB.url, function(err, res)
	{
		if(err)
		{
			console.log("ERROR connecting to database, make shure that mongodb is installed and running.");
			process.exit(1);
		}
	  console.log("Connected to Database");

	    // routes ======================================================================
		// Routers
		var router = express.Router();

		// Main app route
		router.get("/", function(req, res)
		{
			res.render("main/index.html");
		});

		// Serial monitor dev test, TODO remove this
		router.get("/console", function(req, res)
		{
			res.render("serialMonitor/index.html");
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
			var io = socket.listen(app.listen(port, function()
			{
				console.log("Aquila server running on http://localhost:" + port);
			}));

			// Socket configuration
			require("./api/sockets")(io, passport, deviceManager);
		}

		if(deviceManager.ready) onReady();
		else deviceManager.on("ready", onReady);
	});
