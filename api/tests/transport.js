"use strict";

var mongoose = require("mongoose");
var TransportModel = require("../models/transport")(function(){}, mongoose);

mongoose.connect("mongodb://localhost:27017/test", function(err, res)
{
	var transportController = require("../controllers/transport.js");
});


