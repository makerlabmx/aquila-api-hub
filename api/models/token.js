"use strict";

// api/models/user.js

var mongoose = require("mongoose");

var userSchema = mongoose.Schema({
	name: String,
	token: String,
	timestamp: String
});

// methods ======================

// create the model for users and expose it to our app
module.exports = mongoose.model("Token", userSchema);
