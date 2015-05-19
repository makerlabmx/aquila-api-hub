"use strict";

// api/models/transport.js

var mongoose = require("mongoose"),
    Schema   = mongoose.Schema;

var transportSchema = new Schema(
    {
        active: Boolean,
    });