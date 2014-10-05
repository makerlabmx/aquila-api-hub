// admin/routes.js

var express = express = require("express");
var mongoose = require("mongoose");
var User = mongoose.model("User");

module.exports = function(app, passport)
{
	//var AdminCtrl = require("./controllers/admin");

	var adminRouter = express.Router();

	adminRouter.route("/login")
		.get(function(req, res)
		{
			// render the page and pass in any flash data if it exists
			res.render('admin/views/login.ejs', { message: req.flash('loginMessage') });
		})
		.post(passport.authenticate('local-login', {
			successRedirect : '/admin', // redirect to the secure profile section
			failureRedirect : '/admin/login', // redirect back to the signup page if there is an error
			failureFlash : true // allow flash messages
		}));

	adminRouter.route("/signup")
		.get(isLoggedIn, function(req, res) 
		{
			// render the page and pass in any flash data if it exists
			res.render('admin/views/signup.ejs', { message: req.flash('signupMessage') });
		})
		.post(isLoggedIn, passport.authenticate('local-signup', {
			successRedirect : '/admin', // redirect to the secure profile section
			failureRedirect : '/admin/signup', // redirect back to the signup page if there is an error
			failureFlash : true // allow flash messages
		}));

	adminRouter.get('/', isLoggedIn, function(req, res) 
	{
		User.find(function(err, users)
			{
				if(err) return res.send(500, err.message);
				res.render('admin/views/admin.ejs', {
					user : req.user, // get the user out of session and pass to template
					users: users
				});
			});
	});

	// =====================================
	// LOGOUT ==============================
	// =====================================
	adminRouter.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/admin/login');
	});

	// Make app use these routes
	app.use("/admin", adminRouter);

};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
	// if user is authenticated in the session, carry on 
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/admin/login');
}