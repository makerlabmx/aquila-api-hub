var express = require("express"),
	bodyParser = require("body-parser"),
	methodOverride = require("method-override"),
	mongoose = require("mongoose"),
	socket = require("socket.io"),
	toobusy = require('toobusy');

mongoose.connect("mongodb://localhost/aquila", function(err, res)
{
    if(err) throw err;
    console.log("Connected to Database");
});

var app = express();

// Middlewares
app.use(function(req, res, next) {
  // check if we're toobusy() - note, this call is extremely fast, and returns
  // state that is cached at a fixed interval
  if (toobusy()) res.send(503, "I'm busy right now, sorry.");
  else next();
});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(__dirname + "/apps"));
app.set("views", __dirname + "/apps");
app.engine("html", require("ejs").renderFile);

// Import Models and Controllers
var DeviceModel = require("./models/device").Device(app, mongoose);
var InteractionModel = require("./models/interaction").Interaction(app, mongoose);
var ConfigModel = require("./models/config")(app, mongoose);
var DeviceCtrl = require("./controllers/device");
var ConfigCtrl = require("./controllers/config");
var InteractionCtrl = require("./controllers/interaction");

// Routers
var router = express.Router();
var apiRouter = express.Router();

// Main app route
router.get("/", function(req, res)
{
	res.render("main/index.html");
});

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

app.use(router);
app.use("/api", apiRouter);

var deviceManager = require("./controllers/deviceManager");
//Debug:
deviceManager.on("deviceDiscovered", function()
{
	console.log("Device discovered");
});
deviceManager.on("deviceAdded", function()
{
	console.log("Device added");
});
deviceManager.on("deviceRemoved", function()
{
	console.log("Device removed");
});
deviceManager.on("event", function(device, eventN)
{
	console.log("					EVENT: ", eventN, " From Device: ", device.class);
});
// Don't listen until deviceManager is ready:
deviceManager.on("ready", function()
{
	// Init config
	ConfigCtrl.init();
	
	

	var io = socket.listen(app.listen(3000, function() 
	{
		console.log("Node server running on http://localhost:3000");
	}));

	io.sockets.on("connection", function(socket)
	{
		deviceManager.on("deviceDiscovered", function()
		{
			socket.emit("deviceDiscovered");
		});

		deviceManager.on("deviceAdded", function()
		{
			socket.emit("deviceAdded");
		});

		deviceManager.on("deviceRemoved", function()
		{
			socket.emit("deviceRemoved");
		});

		deviceManager.on("event", function(device, eventN)
		{
			socket.emit("event", device, eventN);
		});

	});
});
