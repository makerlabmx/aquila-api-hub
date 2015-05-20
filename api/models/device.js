"use strict";

// api/models/device.js

var mongoose = require("mongoose"),
    Schema   = mongoose.Schema;
    //var interactionSchema = require("./interaction").Schema;

var actionSchema = new Schema(
    {
        n: Number,
        name: String
    });

var eventSchema = new Schema(
    {
        n: Number,
        name: String
    });

// Transports:
/*
    aquila:
        hwAddress: EUI-64 MAC
        shortAddress: 16-bit 802.15.4 address
    ipv4:
        hwAddress: MAC
        shortAddress: ipv4 address

*/

// id: String interpretation of the hwAddress
var deviceSchema = new Schema(
    {
        _id: String,
        transport: {
                transportId: String,
                type: String,
                hwAddress: Buffer,
                shortAddress: String
            },
        class: String,
        name: String,
        _defaultName: String,
        active: Boolean,
        actions: [actionSchema],
        events: [eventSchema],
        services: [String],
        //_fetchComplete: Boolean,
        //_nActions: Number,
        //_nEvents: Number,
        //_nInteractions: Number,
        //_maxInteractions: Number,
        //_retriesInactive: Number,
        //_waitingRefresh: Boolean,
        //_retriesFetch: Number,
        icon: String
        //_interactions: [interactionSchema]
    });

module.exports = {
                    Device: mongoose.model("Device", deviceSchema),
                    Action: mongoose.model("Action", actionSchema),
                    Event: mongoose.model("Event", eventSchema)
                };
