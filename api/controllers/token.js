// api/controllers/token.js

var mongoose = require("mongoose");
var expressJwt = require("express-jwt");
var jwt = require("jsonwebtoken");
var tokenConfig = require("./../../config/token");

// User model
var User = require("./../../api/models/user");

exports.retrieveToken = function(req, res)
{
	if(req.body.user === undefined || req.body.password === undefined) return res.status(401).send('Missing user or password');
	var user = req.body.user;
	var password = req.body.password;

	User.findOne({ name: user }, function(err, user)
        {
            if(err) return res.sendStatus(500);
            if(!user) return res.status(401).send('Wrong user or password');
            if(!user.validPassword(password)) return res.status(401).send('Wrong user or password');

            var profile = {
            	id: user._id,
            	user: user.name
            };

            var token = jwt.sign(profile, tokenConfig.secret);

            res.json({ token: token });
        });
};
