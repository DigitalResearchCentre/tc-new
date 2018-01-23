// config/passport.js
var passport = require('passport');
// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy  = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

//emailer ======================================================================
var TCMailer=require('./localmailer');
var TCAddresses=TCMailer.addresses;

// load up the user model
var User = require('./models/user');
var config = require('./config');
var configAuth = config.auth;

if (config.localDevel) TCMailer = require('./TCMailer');

// expose this function to our app using module.exports

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
  passport.use('local-signup', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
  },
  function(req, email, password, done) {

    // asynchronous
    process.nextTick(function() {

      //  Whether we're signing up or connecting an account, we'll need
      //  to know if the email address is in use.
      User.findOne({'local.email': email}, function(err, existingUser) {
        // if there are any errors, return the error
        if (err)
          return done(err);

        // check to see if there's already a user with that email
        if (existingUser) {
          return done(null, false, req.flash('signupMessage', 'There is already a user with that email.'));
        }
        //  If we're logged in, we're connecting a new local account.
        if(req.user) {
          var user            = req.user;
          user.local.email    = email;
          user.local.password = user.generateHash(password);
          user.local.name = req.body.name;
          user.local.authenticated= "0";
          user.save(function(err) {
            if (err)
              throw err;
            return done(null, user);
          });
        }
        //  We're not logged in, so we're creating a brand new user.
        else {
          // create the user
          var newUser            = new User();
          newUser.local.email    = email;
          newUser.local.name =  req.body.name;
          newUser.local.password = newUser.generateHash(password);
          newUser.local.authenticated= "0";
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
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },
  function(req, email, password, done) { // callback with email and password from our form
    // find a user whose email is the same as the forms email
    // we are checking to see if the user trying to login already exists
    User.findOne({ 'local.email' :  email }, function(err, user) {
      // if there are any errors, return the error before anything else
      if (err)
        return done(err);

      // if no user is found, return the message
      if (!user)
        //reload modal element with our content
        return done(null, false, req.flash('loginMessage', 'No user associated with the email "'+email+'" found.')); // req.flash is the way to set flashdata using connect-flash

      // if the user is found but the password is wrong
      if (!user.validPassword(password))
        return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

      // all is well, return successful user
      return done(null, user);
    });

  }));

  // =========================================================================
  // LOCAL FORGOT (also reset)  =============================================================
  // =========================================================================
  // if this email is not associated with an account, forget

  passport.use('local-forgot', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },
  function(req, email, password, done) { // callback with email  from our form
    // find a user whose email is the same as the forms email
    // we are checking to see if the user trying to login already exists
    User.findOne({ 'local.email' :  email }, function(err, user) {
      // if there are any errors, return the error before anything else
      if (err)
        return done(err);
      // if no user is found, return the message
      if (!user)
        return done(null, false, req.flash('forgotMessage', 'No user with the email "'+email+'"')); // req.flash is the way to set flashdata using connect-flash

      // all is well, go send an email here!
      else {
        resetpass(email, user, done, config.host_url!= ''? config.host_url : req.protocol + '://' + req.get('host'));
        user.save(function(err) {
          if (err)
            throw err;
          return done(null, user);
        });
      }
    });

  }));




  // =========================================================================
  // FACEBOOK ================================================================
  // =========================================================================
  passport.use(new FacebookStrategy({

    clientID        : configAuth.facebookAuth.clientID,
    clientSecret    : configAuth.facebookAuth.clientSecret,
    callbackURL     : configAuth.facebookAuth.callbackURL,
    profileFields: ["emails", "displayName", "name"],
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

  },
  function(req, token, refreshToken, profile, done) {
    // asynchronous
    process.nextTick(function() {
      // check if the user is already logged in
      if (!req.user) {
        User.findOne({ 'facebook.id' : profile.id }, function(err, user) {
          if (err)
            return done(err);

          if (user) {

            // if there is a user id already but no token (user was linked at one point and then removed)
            //mm. could also be associated with another user, watch out here I think
            if (!user.facebook.token) {
              user.facebook.token = token;
              user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
              user.facebook.email = profile.emails[0].value;
              user.save(function(err) {
                if (err)
                  throw err;
                return done(null, user);
              });
            }

            return done(null, user); // user found, return that user
          } else {
            // if there is no user, create them
            // if we decide later to link this to existing account -- we'll have to delete this one
            var newUser            = new User();

            newUser.facebook.id    = profile.id;
            newUser.facebook.token = token;
            newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
            newUser.facebook.email = profile.emails[0].value;

            newUser.save(function(err) {
              if (err)
                throw err;
              return done(null, newUser);
            });
          }
        });

      } else {
        // user already exists and is logged in, we have to link accounts

        var user            = req.user; // pull the user out of the session

        user.facebook.id    = profile.id;
        user.facebook.token = token;
        user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
        user.facebook.email = profile.emails[0].value;

        user.save(function(err) {
          if (err)
            throw err;
          return done(null, user);
        });

      }
    });

  }));

  // =========================================================================
  // TWITTER =================================================================
  // =========================================================================
  passport.use(new TwitterStrategy({

    consumerKey     : configAuth.twitterAuth.consumerKey,
    consumerSecret  : configAuth.twitterAuth.consumerSecret,
    callbackURL     : configAuth.twitterAuth.callbackURL,
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

  },
  function(req, token, tokenSecret, profile, done) {

    // asynchronous
    process.nextTick(function() {
      // check if the user is already logged in
      if (!req.user) {
        User.findOne({ 'twitter.id' : profile.id }, function(err, user) {
          if (err)
            return done(err);
          if (user) {
            // if there is a user id already but no token (user was linked at one point and then removed)
            if (!user.twitter.token) {
              user.twitter.token       = token;
              user.twitter.username    = profile.username;
              user.twitter.displayName = profile.displayName;
              user.save(function(err) {
                if (err)
                  throw err;
                return done(null, user);
              });
            }
            return done(null, user); // user found, return that user
          } else {
            // if there is no user, create them
            //also, should get a local email address from the user to associate with this account...
            var newUser                 = new User();
            newUser.twitter.id          = profile.id;
            newUser.twitter.token       = token;
            newUser.twitter.username    = profile.username;
            newUser.twitter.displayName = profile.displayName;
            newUser.save(function(err) {
              if (err)
                throw err;
              return done(null, newUser);
            });
          }
        });

      } else {
        // user already exists and is logged in, we have to link accounts
        var user                 = req.user; // pull the user out of the session

        user.twitter.id          = profile.id;
        user.twitter.token       = token;
        user.twitter.username    = profile.username;
        user.twitter.displayName = profile.displayName;

        user.save(function(err) {
          if (err)
            throw err;
          return done(null, user);
        });
      }

    });

  }));

  // =========================================================================
  // GOOGLE ==================================================================
  // =========================================================================
  passport.use(new GoogleStrategy({

    clientID        : configAuth.googleAuth.clientID,
    clientSecret    : configAuth.googleAuth.clientSecret,
    callbackURL     : configAuth.googleAuth.callbackURL,
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

  },
  function(req, token, refreshToken, profile, done) {

    // asynchronous
    process.nextTick(function() {

      // check if the user is already logged in
      if (!req.user) {

        User.findOne({ 'google.id' : profile.id }, function(err, user) {
          if (err)
            return done(err);

          if (user) {

            // if there is a user id already but no token (user was linked at one point and then removed)
            if (!user.google.token) {
              user.google.token = token;
              user.google.name  = profile.displayName;
              user.google.email = profile.emails[0].value; // pull the first email

              user.save(function(err) {
                if (err)
                  throw err;
                return done(null, user);
              });
            }

            return done(null, user);
          } else {
            var newUser          = new User();

            newUser.google.id    = profile.id;
            newUser.google.token = token;
            newUser.google.name  = profile.displayName;
            newUser.google.email = profile.emails[0].value; // pull the first email

            newUser.save(function(err) {
              if (err)
                throw err;
              return done(null, newUser);
            });
          }
        });

      } else {
        // user already exists and is logged in, we have to link accounts
        var user               = req.user; // pull the user out of the session

        user.google.id    = profile.id;
        user.google.token = token;
        user.google.name  = profile.displayName;
        user.google.email = profile.emails[0].value; // pull the first email

        user.save(function(err) {
          if (err)
            throw err;
          return done(null, user);
        });

      }

    });

  }));

var crypto = require('crypto');
var base64url = require('base64url');

/** Sync */
function randomStringAsBase64Url(size) {
  return base64url(crypto.randomBytes(size));
}

function resetpass (email, user, done, thisURL) {
//  console.log("to "+email+" dir "+__dirname);
  var ejs = require('ejs')
    , fs = require('fs')
    , str = fs.readFileSync(__dirname + '/views/resetemail.ejs', 'utf8')
    , hash=randomStringAsBase64Url(20)
    , rendered
  ;
  rendered = ejs.render(str, {
    email:email, hash:hash, username:user.local.name, url: thisURL
  });
//  console.log( TCAddresses.replyto+" "+TCAddresses.from);
  user.local.timestamp=new Date().getTime();
  user.local.hash=hash;
  TCMailer.localmailer.sendMail({
    from: TCAddresses.from,
    to: email,
    subject: 'Reset your Textual Communities password',
    'h:Reply-To': TCAddresses.replyto,
    html: rendered,
    text: rendered.replace(/<[^>]*>/g, '')
  }, function (err, info) {
    if (err) {console.log('Error: ' + err);}
  });
}

module.exports = passport;
