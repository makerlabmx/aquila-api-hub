"use strict";

var mongoose = require("mongoose");
var expressJwt = require("express-jwt");
var jwt = require("jsonwebtoken");
var configManager = require("./../../configManager");
var tokenConfig = require(configManager.tokenPath);
var Token = mongoose.model('Token');

// User model
var User = require("./../../api/models/user");

exports.findAllTokens = function(req, res) {
  Token.find(function(err, tokens) {
    if (err) return res.status(500).send(err.message);

    res.status(200).json(tokens);
  });
};

exports.findById = function(req, res) {
  Token.findById(req.params.id, function(err, token) {
    if (err) return res.status(500).send(err.message);

    res.status(200).json(token);
  });
};

exports.createToken = function(req, res)
{
	if(req.body.user === undefined ) return res.status(401).send('Missing user');
	var user = req.body.user;
  var name = req.body.name;

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

            var newToken = new Token({
              name: name,
              token: token,
              timestamp: today
            });

            newToken.save(function(err){
              if(err) return res.status(500).send(err.message);
            });

            res.json(newToken);
        });
};

exports.deleteToken = function(req, res) {
  Token.findByIdAndRemove(req.params.id, function(err) {
    if (err) return res.status(500).send(err.message);
    res.json({message: "Token removed"});
  });
};
