"use strict";

var mongoose = require("mongoose");
var expressJwt = require("express-jwt");
var jwt = require("jsonwebtoken");
var configManager = require("./../../configManager");
var tokenConfig = require(configManager.tokenPath);

// User model
var User = require("./../../api/models/user");

exports.createToken = function(req, res)
{
	if(req.body.user === undefined ) return res.status(401).send('Missing user');
	var user = req.body.user;

	User.findOne({ name: user }, function(err, user)
        {
            if(!user) return res.status(401).send("Not authorized to create tokens");
            if(err) return res.sendStatus(500);

            var today = new Date().toISOString().replace('T', ' ').substr(0, 19);

            var profile = {
            	id: user._id,
            	user: user.name,
              timestamp: today
            };

            var token = jwt.sign(profile, tokenConfig.secret);

            res.json({ token: token });
        });
};
