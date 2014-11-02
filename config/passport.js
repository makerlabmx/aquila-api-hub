// config/passport.js

var LocalStrategy = require("passport-local").Strategy;
var BearerStrategy = require("passport-http-bearer").Strategy;
var BasicStrategy = require("passport-http").BasicStrategy;

// User model
var User = require("../api/models/user");

var defaultAdminPassword = "Admin";

// create default admin user if its not created
var initAdminUser = function()
{
    User.findOne({ name: "Admin" }, function(err, user)
        {
            if(err) throw err;
            // create admin user if it doesn't exist:
            if(!user)
            {
                var adminUser = new User();
                adminUser.name = "Admin";
                adminUser.password = adminUser.generateHash(defaultAdminPassword);
                adminUser.isAdmin = true;
                adminUser.save(function(err)
                    {
                        if(err) throw err;
                        return console.log("Created default Admin user.");
                    });
            }
        });
};

module.exports = function(passport)
{
    initAdminUser();

    // passport http basic auth
    passport.use(new BasicStrategy(function(userid, password, done)
        {
            User.findOne({ name: userid }, function(err, user)
                {
                    if(err) return done(err);
                    if(!user) return done(null, false);
                    if(!user.validPassword(password)) return done(null, false);
                    return done(null, user);
                });
        }));

    // passport http-bearer token
    /*passport.use(new BearerStrategy(function(token, done)
        {
            console.log("inside bearer");
            console.log(token);
            User.findOne({ token: token }, function(err, user)
                {
                    if(err) return done(err);
                    if(!user) return done(null, false);
                    return done(null, user, { scope: 'all' });
                });
        }));*/

// =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'name',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, name, password, done) {

        // asynchronous
        // User.findOne wont fire unless data is sent back
        process.nextTick(function() {

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'name' :  name }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                return done(err);

            // check to see if theres already a user with that email
            if (user) {
                return done(null, false, req.flash('signupMessage', 'That name is already taken.'));
            } else {

                // if there is no user with that email
                // create the user
                var newUser            = new User();

                // set the user's local credentials
                newUser.name    = name;
                newUser.password = newUser.generateHash(password);
                newUser.isAdmin = true;

                // save the user
                newUser.save(function(err) {
                    if (err)
                        throw err;
                    return done(null, newUser);
                });
            }

        });    

        });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'name',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, name, password, done) { // callback with email and password from our form
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'name' :  name }, function(err, user) {
            // if there are any errors, return the error before anything else
            if (err)
                return done(err);

            // if no user is found, return the message
            if (!user)
                return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

            // if the user is found but the password is wrong
            if (!user.validPassword(password))
                return done(null, false, req.flash('loginMessage', 'Wrong password.')); // create the loginMessage and save it to session as flashdata

            // all is well, return successful user
            return done(null, user);
        });

    }));

}