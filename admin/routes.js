// admin/routes.js

var express = require("express");
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

	adminRouter.get("/", isLoggedIn, function(req, res)
	{
		User.find(function(err, users)
			{
				if(err) return res.send(500, err.message);
				res.render('admin/views/admin.ejs', {
					user : req.user, // get the user out of session and pass to template
					users: users,
					message: req.flash('adminMessage')
				});
			});
	});

	adminRouter.route("/edit/:id")
		.get(isLoggedIn, function(req, res)		// Get view
			{
				console.log(req.params.id);
				User.findById(req.params.id, function(err, user)
					{
						if(err) return console.log(err);
						res.render("admin/views/edit.ejs", { user: user });
					});
			})
		.post(isLoggedIn, function(req, res)
			{
				User.findById(req.params.id, function(err, user)
					{
						if(req.body.password)
						{
							user.password = user.generateHash(req.body.password);
							user.save(function(err)
								{
									if(err) req.flash("adminMessage", "There was an error changing the password");
									else req.flash("adminMessage", "Password changed ok");
									return res.redirect("../");
								});
						}
						else
						{
							req.flash("adminMessage", "Invalid password");
							res.redirect("../");
						}
					});
			});

	adminRouter.get("/delete/:id", isLoggedIn, function(req, res)
		{
			User.findById(req.params.id, function(err, user)
				{
					if(err)
					{
						req.flash("adminMessage", 'There was an error removing an user');
						return res.redirect("../");
					}

					if(user.name === "Admin")
					{
						req.flash("adminMessage", "Admin user can't be removed");
						return res.redirect("../");
					}

					user.remove(function(err)
						{
							if(err)
							{
								req.flash("adminMessage", 'There was an error removing an user');
								return res.redirect("../");
							}
							req.flash("adminMessage", 'User "' + user.name + '" Removed');
							res.redirect("../");
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
