"use strict";

// api/models/transport.js

var mongoose = require("mongoose"),
    Schema   = mongoose.Schema;

var transportSchema = new Schema(
    {	
    	_id: String,
    	type: String,
        active: Boolean
    });

module.exports = mongoose.model("Transport", transportSchema);
