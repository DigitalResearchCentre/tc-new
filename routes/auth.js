var express = require('express')
  , passport = require('../passport')
  , router = express.Router()
  , User = require('../models/user')
  , TCMailer=require('../TCMailer')
  , TCAddresses=TCMailer.addresses


;

var TCModalState = {state:0};
// =====================================
// HOME PAGE (with login links) ========
// =====================================

router.get('/', function(req, res) {
    res.render('index.ejs', {url: req.query.url}); // load the index.ejs file
});


// =====================================
// LOGIN ===============================
// =====================================
// show the login form
router.get('/login', function(req, res) {
  var url=req.query.url;
  // render the page and pass in any flash data if it exists
  res.render('login.ejs', { message: req.flash('loginMessage'), email:"", url: url});
});

// process the login form

router.post('/login', function(req, res, next) {
  // callback with email and password from our form
   // find a user whose email is the same as the forms email
   // we are checking to see if the user trying to login already exists
    var url=req.query.url;
    User.findOne({ 'local.email' :  req.body.email }, function(err, user) {
     // if no user is found, return the message
     if (!user) {
       res.render('login.ejs', {message: "No user associated with the email '"+req.body.email+"' found.", email:req.body.email, url:url});
       return;
      }
     // if the user is found but the password is wrong
     if (!user.validPassword(req.body.password)) {
        res.render('login.ejs', {message: "Oops! wrong password", email:req.body.email, url: url});
        return;
      }
      //are we authenticated? if not...send email and return message
      if (!isValidProfile(user)) {
        authenticateUser (user.local.email, user, req.protocol + '://' + req.get('host'));
        res.render('authenticate.ejs', {context:"email", user: user});
        req.logout();
        return;
      }
     // all is well, log me in, return successful user
     req.logIn(user, function (err) {
       if (url=="") url="/app/home"
       console.log("logging in happily err "+err+" url "+url)
       if (!err) {res.render('closemodal.ejs', {url: "app"} );} else {}
     });
   });
});

// =====================================
// SIGNUP ==============================
// =====================================
// show the signup form
router.get('/signup', function(req, res) {
  var url=req.query.url;
  res.render('signup.ejs', { message: "", url:url, email:""});
});

// process the signup form
router.post('/signup', function(req, res) {

  User.findOne({'local.email': req.body.email}, function(err, existingUser) {
    // if there are any errors, return the error
    // check to see if there's already a user with that email
    if (existingUser) {
      res.render('signup.ejs', {message: 'There is already a user with the email "'+req.body.email+'".',url:req.body.urlstring, email:""});
      return;
    }
    //check do we have a password, etc
    if (req.body.password.length<5) {
      res.render('signup.ejs', {message: 'Password must be at least five characters',url:req.body.urlstring, email: req.body.email});
      return;
    }
    if (req.body.name.length<1) {
      res.render('signup.ejs', {message: 'We need a name for you! Please',url:req.body.urlstring, email: req.body.email});
      return;
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
      newUser.local.email    = req.body.email;
      newUser.local.name =  req.body.name;
      newUser.local.password = newUser.generateHash(req.body.password);
      newUser.local.authenticated= "0";
      newUser.save(function(err) {
        if (err) {}
        authenticateUser (newUser.local.email, newUser, req.protocol + '://' + req.get('host'));
        res.render('authenticate.ejs', {context:"email", user: newUser})
        req.logout();
        return;
      });
    }
  });
});

// =====================================
// AUTHENTICATE ACCOUNT ===============
// =====================================
// called from /profile, if this user is not authenticated
router.get('/sendauthenticate', function(req, res) {
  var user=req.user;
  authenticateUser (req.user.local.email, req.user, req.protocol + '://' + req.get('host'));
  // render the page and pass in any flash data if it exists
  res.render('authenticate.ejs', {user: user, context: req.query.context} );
  req.logout();
});

router.get('/authlinkExpired', function(req, res) {
  res.render('forgothourpassed.ejs', {greeting: 'Authentication link expired', greeting2: 'For security, links to authenticate accounts expire after one hour. Try logging in again to have a new authentication link sent.', authenticate:"1"});
});

router.get('/authlinkNotFound', function(req, res) {
  res.render('forgothourpassed.ejs', {greeting: 'No user found for that link', greeting2: 'You are likely using an old authentication link. Try logging in again to have a new authentication link sent.', authenticate:"1"});
});

router.get('/authenticateTC', function(req, res) {
  // find the user with this hash; check datestamp; authenticate and save
  User.findOne({ 'local.hash' :  req.query.hash }, function(err, user) {
    if (user) {
      //check the time stamp. If more than one hour ago, ask for redo
      var timeNow= new Date().getTime();
      var diff=timeNow-user.local.timestamp;
      if (diff>60*60*1000) {
          res.redirect("/app?prompt=authlinkExpired");
            return;
      }    else {
        user.local.authenticated= "1";
        user.local.hash= "";
        user.save();
          //log me in
        req.logIn(user, function (err) {
          res.redirect('/app?prompt=TCauthenticateDone&context=newuser');
          return;
        });
      return;
      }
    } else {
      res.redirect("/app?prompt=authlinkNotFound");
  //    res.render('forgothourpassed.ejs', {greeting: 'No user to be authenticated found for that link', greeting2: 'You are likely using an old authentication link. Try logging in again to have a new authentication link sent.', authenticate:"1"});
    }
  });
});

router.get('/authenticateOK', function(req, res) {
    var message;
    if (req.query.context=="newuser") message='You are now authenticated.  Click on "Create Community" to start your own new community, or "Join" to become part of an existing one.'
    res.render('authenticateOK.ejs', {message:message, user: req.user});
});
// =====================================
// FORGOT PASSWORD ==============================
// =====================================
// show the forgot password form
router.get('/forgot', function(req, res) {
  res.render('forgot.ejs', { message: req.flash('forgotMessage') });
});

router.get('/resetpwExpired', function(req, res) {
  req.logout();
  res.render('forgothourpassed.ejs', {greeting: 'Reset password link expired', greeting2: 'For security, links to reset passwords expire after one hour.', authenticate:"0"});
});

router.get('/resetpw', function(req, res) {
  // find the user with this hash; check datestamp; get a new password
  User.findOne({ 'local.hash' :  req.query.hash }, function(err, user) {
    if (user) {
      //check the time stamp. If more than one hour ago, ask for redo
      var timeNow= new Date().getTime();
      var diff=timeNow-user.local.timestamp;
      if (diff>1000*60*60) {
        res.redirect('/app?prompt=resetpwExpired');
        return;
      } else {
        res.redirect('/app?prompt=TCresetpw&context='+user.local.email+'&name='+user.local.name);
      }
    } else {
      res.redirect('/app?prompt=TCresetpwExpired');
    }
  });
});

router.get('/TCresetpwExpired',  function(req, res) {
  res.render('forgothourpassed.ejs', {greeting: 'No request found for that link', greeting2: 'You are likely using an old reset password link.', authenticate:"0"});
});


router.get('/TCresetpw',  function(req, res) {
  res.render('resetpw.ejs', { message: "", name: req.query.name, email:req.query.email})
});

router.post('/resetpw',  function(req, res) {
  //    	console.log("resetting password for " +req.body.password+" pwd2 "+req.body.passwordconfirm+" email "+req.body.email+" name "+req.body.displayName);
  if (req.body.password!=req.body.passwordconfirm) {
    res.render('resetpw.ejs', {message: "Password and confirm password do not match", name: req.body.displayName, email: req.body.email});
  } else if (req.body.password.length<5){
    res.render('resetpw.ejs', {message: "Password must be at least five characters", name: req.body.displayName, email: req.body.email});
  } else {
    //       	console.log("Match!")
    User.findOne({ 'local.email' :  req.body.email }, function(err, user) {
      if (user) {
        user.local.password = user.generateHash(req.body.password);
        user.local.hash="";
        user.save();
        res.render('login.ejs', { message: 'You can now log in with your new password', email: req.body.email, url:"" });
      } //can't be here if there is no user!
    });
  }
});



// process the forgot password form
router.post('/forgot', passport.authenticate('local-forgot', {
  successRedirect : '/auth/resetpwmsg', // redirect to the secure profile section
  failureRedirect : '/auth/forgot', // redirect back to the signup page if there is an error
  failureFlash : true // allow flash messages
}));

router.get('/resetpwmsg', function(req, res) {
  // render the page and pass in any flash data if it exists
  req.logout();
  res.render('resetpwmsg.ejs');
});

// =====================================
// PROFILE SECTION =====================
// =====================================
// we will want this protected so you have to be logged in to visit
// we will use route middleware to verify this (the isLoggedIn function)
router.get('/profile', isLoggedIn, function(req, res) {
  res.render('profile.ejs', {user : req.user  });
});
// =====================================
// FACEBOOK ROUTES =====================
// =====================================
// route for facebook authentication and login
router.get('/callfacebook', function(req, res) {
    TCModalState.state=1;
    res.redirect('/auth/facebook');
  }
);

router.get('/facebook', passport.authenticate('facebook', {
    scope : 'email'
  })
);

// handle the callback after facebook has authenticated the user
//note: we have to call parent window from here, so set return to modal window via parent
router.get('/facebook/callback', passport.authenticate('facebook', {
  scope : 'email',
  failureRedirect : '/auth/'
}), function(req, res) {
  //if TCModalState.state is 1: then we are coming from index.ejs; after success, return to main window
  //by closing modal; if state is 3, stay in this window
  // The user has authenticated with Facebook.  Now check to see if the profile
  // The user has authenticated with Facebook.  Now check to see if the profile
  // is "complete".  If not, send them down a form to fill out more details.
  //ah... req will have the facebook user, which may NOT have been identified with the local user..
  if (isValidProfile(req.user)) {
      res.redirect('/app');
  } else {
    //first, check if there is a user with this email
    User.findOne({'local.email':  req.user.facebook.email }, function(err, user) {
      if (user) {
        //there might be a facebook account already associated with this user. So tell them
        if (user.facebook.email) {
          //could be not authenticated -- that would get us here
          if (user.local.authenticated=="0") {
            res.redirect('/app?prompt=sendauthenticate&context=facebook');
          }
           else res.redirect("/app?prompt=alreadylocal&context=Facebook&name="+req.user.facebook.email);
        } else  {
        //we have a user with no fb account
          res.redirect('/app?prompt=facebookassocemail');
        }
      } else {res.redirect('/app?prompt=facebooklinkemail');}
    });
  }
});

router.get('/alreadylocal', function(req, res) {
    res.render('alreadylocal.ejs',{context: req.query.context, email:req.query.email})
});

//calls the modal frame window
router.get('/facebookassocemail', function(req, res) {
    res.render('associate.ejs', { email: req.user.facebook.email, context:"Facebook", linkname: "facebook"});
});

//cancel the link .. to do, if the modal closes, we need to catch the event, this = cancel
router.get('/facebookcancel', function(req, res) {
  User.findOne({'facebook.id': req.user.facebook.id}, function(err, deleteUser) {
      deleteUser.remove({});
  });
  res.render('closemodal.ejs', {url: "/app/home"});
});

//we have the go ahead: link the accounts
router.get('/facebooklink', function(req, res) {
  //get the user record again; link; delete surplus facebook ac
  User.findOne({'local.email':  req.user.facebook.email }, function(err, user) {
    if (err) {return}
    if (user) {
      user.facebook=req.user.facebook;
      User.findOne({'facebook.id': req.user.facebook.id}, function(err, deleteUser) {
          deleteUser.remove({});
          user.save();
          req.logIn(user, function (err) {
            res.render('closemodal.ejs', {url: "/app?prompt=showprofile"} );
          });
      });
    } else { //did not find this user?
      res.render('error.ejs', {message:"Error linking facebook account", error: err})
    }
  });
});

router.get('/facebooklinkemail', function(req, res) {
  res.render('facebookemail.ejs', { message: "", facebook:req.user.facebook});
});

router.post('/facebooklinkemail', function(req, res) {
  // render the page and pass in any flash data if it exists
  if (req.body.email!=req.body.emailconfirm) {
    res.render('facebookemail.ejs', { message: "Email '"+req.body.email+"' and confirm email '"+req.body.emailconfirm+"' do not match. Try again", facebook:req.user.facebook});
    return;
  }
  var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!req.body.email.match(mailformat)) {
    res.render('facebookemail.ejs', { message: "'"+req.body.email+"' is not a valid email. Try again", facebook:req.user.facebook});
    return;
  }
  //ok! we have a valid email.  Write it into the local account, with the display name, and send an activation email
  //does this email already exist for an account? if so, and there is no facebook account for this user -- just link!
  //if this is so: reset authenticate to 0 to force authentication via the email account
  //also: need to delete the facebook account we just made with this id...
  //save the values we need, delete th fb ac we just made
  User.findOne({'local.email': req.body.email}, function(err, existingUser) {
    if (existingUser) {
      //if there is no google person reg'd with this local email -- just write the details there!

      if (!existingUser.facebook.token) {
        existingUser.facebook=req.user.facebook;
        //this can't delete the wrong one, because we have not yet saved this one
        User.findOne({'facebook.id': req.user.facebook.id}, function(err, deleteUser) {
          deleteUser.remove({});
          existingUser.save(); //in case of synchrony -- we don't need the separate one we just made
        });
        if (!isValidProfile(existingUser)) {
          authenticateUser (existingUser.local.email, existingUser, req.protocol + '://' + req.get('host'));
          res.render('authenticate.ejs', {context:"email", user: existingUser})
          req.logout();
          return;
        }
        //do we need this? yes...
          //log out current user; log in existingUser
        req.logout();
        req.logIn(existingUser, function (err) {
          //ok, we are all logged in, close the dialog, call the base url, put up profile screen
          //put up the profile screen then
          if(!err) {
            res.render(res.render('closemodal.ejs', {url: '/app?prompt=showprofile'}) );
            return;
          } else{		//handle error
          } });
          return;
      }
      else {
        //already have such a fb ac! delete the one we just made, then
        res.render('facebookemail.ejs', { message: "There is already a Facebook account for the Textual Communities user identified by the email '"+req.body.email+"'. If you want to link this Faceboo account to that account, log in with that email address, unlink the existing Facebook account and then link this Facebook account.", facebook:req.user.facebook});
        return;
      }
    }
    else {
      res.render('facebookemail.ejs', { message: "There is no Textual Communities account identified by the email '"+req.body.email+"'. If you want to start a new account identified by that email, go back to the sign up screen.", facebook:req.user.facebook});
    }
  });
});

//just set up a new account
router.get('/facebooknew', function(req, res) {

  if (req.user.local.name) {
    var thisUser=new User();
    thisUser.facebook=req.user.facebook;
    req.user.facebook=undefined;
    req.user.save();
  } else {
    var thisUser=req.user;
  }
  thisUser.local.email=thisUser.facebook.email;
  thisUser.local.name=thisUser.facebook.name;
  thisUser.local.password=thisUser.generateHash("X"); //place holder
  thisUser.local.authenticated= "0";
  thisUser.save(function(err) {
    if (err) {}
    authenticateUser (thisUser.local.email, thisUser, req.protocol + '://' + req.get('host'));
    res.render('authenticate.ejs', {context:"facebook", user: thisUser});
    req.logout();
  });
});




//check if there is a surplus SM acc with this user...
//also: check; if not authenticated, log out.  Handles clicks on modal backdrop too
router.get('/removeSurplusSM', isLoggedIn, function(req, res) {
  var context=req.query.context;
  if (req.user.facebook.email && !req.user.local.email) {
    User.findOne({'facebook.id': req.user.facebook.id}, function(err, deleteUser) {
      deleteUser.remove({});
    });
  }
  if (req.user.google.email && !req.user.local.email) {
    User.findOne({'google.id': req.user.google.id}, function(err, deleteUser) {
      deleteUser.remove({});
    });
  }
  if (req.user.twitter.id && !req.user.local.email) {
    User.findOne({'twitter.id': req.user.twitter.id}, function(err, deleteUser) {
      deleteUser.remove({});
    });
  }
  if (req.user.local.authenticated=="0" || req.user.local.name== undefined) {
      req.logout();
      if (context=="outside") res.render('closemodal.ejs', {url: "/app/home"} );
      else res.redirect('/app#/home');
  } else  {
    if (context=="outside") res.render('closemodal.ejs', {url: "/app"} );
    else res.redirect('/app');
  }
});

//cancel this facebook linkage
router.get('/facebookcancel', function(req, res) {
  User.findOne({'facebook.id': req.user.facebook.id}, function(err, deleteUser) {
    deleteUser.remove({});
  });
  res.render('closemodal.ejs', {url: "/app/home"} );
});



// =====================================
// TWITTER ROUTES ======================
// =====================================
// route for twitter authentication and login
router.get('/calltwitter', function(req, res) {
    TCModalState.state=1;
    res.redirect('/auth/twitter');
  }
);


router.get('/twitter', passport.authenticate('twitter'));

// handle the callback after twitter has authenticated the user
router.get('/twitter/callback', passport.authenticate('twitter', {
  failureRedirect : '/auth/'
}), function(req, res) {
  // The user has authenticated with Twitter.  Now check to see if the profile
  // is "complete".  If not, send them down a form to fill out more details.
  if (isValidProfile(req.user)) {
    if (TCModalState.state==3) res.redirect('/app?prompt=showprofile');
    else res.redirect('/app');
  } else {
    if (!req.user.local.email) res.redirect('/app?prompt=twitteremail');
    else {
      if (req.user.local.authenticated=="0") {
        authenticateUser (req.user.local.email, req.user, req.protocol + '://' + req.get('host'));
        res.redirect('/app?prompt=sendauthenticate&context=twitter');
      }
    }
  }
});

//we don't have a twitter email! get one
router.get('/twitteremail', function(req, res) {
  // render the page and pass in any flash data if it exists
  res.render('twitteremail.ejs', { message: req.flash('twitterMessage'), name:req.user.twitter.displayName });
});

router.get('/twittercancel', function(req, res) {
  //logout, delete the user
  //      console.log("who I am in delete: "+req.user);
  var twitterid=req.user.twitter.id;
  req.logout();
  User.findOne({'twitter.id': twitterid}, function(err, deleteUser) {
    deleteUser.remove({});
  });
  res.render('closemodal.ejs', {url: "/app/home"} );
});

router.post('/twitterlinklocal', function(req, res) {
  User.findOne({'local.email': req.body.email}, function(err, existingUser) {
    if (existingUser) {
      existingUser.twitter=req.user.twitter;
      User.findOne({'twitter.id': req.user.twitter.id}, function(err, deleteUser) {
        deleteUser.remove({});
      });
      existingUser.save();
      if (existingUser.local.authenticated=="0") {
        authenticateUser (existingUser.local.email, existingUser, req.protocol + '://' + req.get('host'));
        res.render('authenticate.ejs', {user: existingUser, context: "twitter"} );
        req.logout();
      } else {
        req.logout();
        req.logIn(existingUser, function (err) {
          if(!err){
            res.render('closemodal.ejs', {url: "/app/home?prompt=showprofile"});
          } else {
            res.render('error.ejs', {message:"Failed to log in linked twitter account for "+req.body.email, error:err});
          }
      });
    }
  } else {
      res.render('error.ejs', {message:"Failed to find local email account for "+req.body.email, error:err});
  }
 });
});


router.post('/twitteremail', function(req, res) {
  // render the page and pass in any flash data if it exists
  if (req.body.email!=req.body.emailconfirm) {
    res.render('twitteremail.ejs', { message: "Email '"+req.body.email+"' and confirm email '"+req.body.emailconfirm+"' do not match. Try again", name:req.user.twitter.displayName});
    return;
  }
  var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!req.body.email.match(mailformat)) {
    res.render('twitteremail.ejs', { message: "'"+req.body.email+"' is not a valid email. Try again", name:req.user.twitter.displayName});
    return;
  }
  //ok! we have a valid email.
  //if no local account with this email -- just set up.
  //If there is a local email: If the local ac already has a twitter ac, warn and cancel
  //If it does not have a twitter ac, then send another screen to confirm

  //does this email already exist for an account? if so, and there is no twitter account for this user -- just link!
//if this is so: reset authenticate to 0 to force authentication via the email account

  User.findOne({'local.email': req.body.email}, function(err, existingUser) {
    if (existingUser) {
      //if there is no twitter person reg'd with this local email -- just write the details there!
      //if there is no twitter account associated with the account -- send a link to confirm add twitter to this
      if (!existingUser.twitter.token) {
        res.render('twitterlinklocal.ejs', {twitter: req.user.twitter, local: existingUser.local});
      }
      else {
        res.render('twitteremail.ejs', { message: "There is already a Twitter account linked to the Textual Communities user identified by the email '"+req.body.email+"'. If you want to link this twitter account to that account, log in with that email and unlink the Twitter account from \"Login Profile\".", name:req.user.twitter.displayName});
        return;
      }
    } else {
      //there isn't one! so, just set the local email and display name to the values here
      req.user.local.email=req.body.email;
      req.user.local.name=req.user.twitter.displayName;
      req.user.local.password=req.user.generateHash("X"); //place holder
      req.user.local.authenticated= "0";
      req.user.save();
      authenticateUser (req.user.local.email, req.user, req.protocol + '://' + req.get('host'));
      res.render('authenticate.ejs', {context:"twitter", user: req.user});
      req.logout();
    }
  });
});

// =====================================


// GOOGLE ROUTES =======================
// =====================================
// send to google to do the authentication
// profile gets us their basic information including their name
// email gets their emails
router.get('/callgoogle', function(req, res) {
    TCModalState.state=1;
    res.redirect('/auth/google');
  }
);


router.get('/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

// the callback after google has authenticated the user
router.get('/google/callback', passport.authenticate('google', {
  scope: 'email',
  failureRedirect : '/auth/'
}), function(req, res) {
  // The user has authenticated with google.  Now check to see if the profile
  // is "complete".  If not, send them down a form to fill out more details.
  if (isValidProfile(req.user)) {
    if (TCModalState.state==3) res.redirect('/app?prompt=showprofile');
    else res.redirect('/app');
  } else {
    User.findOne({'local.email':  req.user.google.email }, function(err, user) {
      //there might be a google account already associated with this user. So tell them
      if (user) {
        if (user.google.email) {
          //could be not authenticated -- that would get us here
          if (user.local.authenticated=="0") {
            res.redirect('/app?prompt=sendauthenticate&context=google');
          }
           else res.redirect("/app?prompt=alreadylocal&context=Google&name="+req.user.google.email);
        } else  {
        //we have a user with no google account
          res.redirect('/app?prompt=googleassocemail');
        }
      } else {res.redirect('/app?prompt=googlelinkemail');}
    });
  }
});

router.get('/googleassocemail', function(req, res) {
    res.render('associate.ejs', { email: req.user.google.email, context:"Google", linkname: "google"});
});

router.get('/googlelinkemail', function(req, res) {
  res.render('googleemail.ejs', { message: "", google:req.user.google});
});

router.post('/googlelinkemail', function(req, res) {
  // render the page and pass in any flash data if it exists
  if (req.body.email!=req.body.emailconfirm) {
    res.render('googleemail.ejs', { message: "Email '"+req.body.email+"' and confirm email '"+req.body.emailconfirm+"' do not match. Try again", google:req.user.google});
    return;
  }
  var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!req.body.email.match(mailformat)) {
    res.render('googleemail.ejs', { message: "'"+req.body.email+"' is not a valid email. Try again", google:req.user.google});
    return;
  }
  //ok! we have a valid email.  Write it into the local account, with the display name, and send an activation email
  //does this email already exist for an account? if so, and there is no facebook account for this user -- just link!
  //if this is so: reset authenticate to 0 to force authentication via the email account
  //also: need to delete the facebook account we just made with this id...
  //save the values we need, delete th fb ac we just made
  User.findOne({'local.email': req.body.email}, function(err, existingUser) {
    if (existingUser) {
      //if there is no google person reg'd with this local email -- just write the details there!

      if (!existingUser.google.token) {
        existingUser.google=req.user.google;
        //this can't delete the wrong one, because we have not yet saved this one
        User.findOne({'google.id': req.user.google.id}, function(err, deleteUser) {
          deleteUser.remove({});
          existingUser.save(); //in case of synchrony -- we don't need the separate one we just made
        });
        if (!isValidProfile(existingUser)) {
          authenticateUser (existingUser.local.email, existingUser, req.protocol + '://' + req.get('host'));
          res.render('authenticate.ejs', {context:"google", user: existingUser})
          req.logout();
          return;
        }
        //do we need this? yes...
          //log out current user; log in existingUser
        req.logout();
        req.logIn(existingUser, function (err) {
          //ok, we are all logged in, close the dialog, call the base url, put up profile screen
          //put up the profile screen then
          if(!err) {
            res.render(res.render('closemodal.ejs', {url: '/app?prompt=showprofile'}) );
            return;
          } else{		//handle error
          } });
          return;
      }
      else {
        //already have such a fb ac! delete the one we just made, then
        res.render('googleemail.ejs', { message: "There is already a Facebook account for the Textual Communities user identified by the email '"+req.body.email+"'. If you want to link this Google account to that account, log in with that email address, unlink the existing Google account and then link this Google account.", google:req.user.google});
        return;
      }
    }
    else {
      res.render('googlemail.ejs', { message: "There is no Textual Communities account identified by the email '"+req.body.email+"'. If you want to start a new account identified by that email, go back to the sign up screen.", google:req.user.google});
    }
  });
});

//do we use this one now at all???
router.get('/googleemail', function(req, res) {
  //can only be here because google has registered user, but as yet not associated with any main email
  //so check: if our google email does not belong to an existing user, then just write primary google email to local email
  User.findOne({ 'local.email' :  req.user.google.email }, function(err, user) {
    if (!user) {
      //let's redirect -- ask if we want to associate with an existing account or not
      res.redirect('/auth/googlelinkemail');
    } else {
      //by google rules -- this email can ONLY be assoc with one account.  So just link them
      //if there is no google account associated with the account -- just link this  ac to that
      if (!user.google.token) {
        user.google=req.user.google;
        User.findOne({'google.id': req.user.google.id}, function(err, deleteUser) {
          deleteUser.remove({});
        });
        user.save();
        req.logout();
        req.logIn(user, function (err) {
          if(!err){ res.redirect('/auth/profile'); }else {		//handle error
          } });
          return;
      }
      else res.render('error.ejs', { message: "Error linking Google account", name:req.user.google.name, email: req.user.google.email }); //should not happen! if there is a google for this user we should be in it now
    }
  });
});

router.get('/googlelinkemail', function(req, res) {
  res.render('googleemail.ejs', { message: req.flash('googleMessage'), google:req.user.google });
});

router.post('/googlelinkemail', function(req, res) {
  // render the page and pass in any flash data if it exists
  if (req.body.email!=req.body.emailconfirm) {
    res.render('googleemail.ejs', { message: "Email '"+req.body.email+"' and confirm email '"+req.body.emailconfirm+"' do not match. Try again", google:req.user.google});
    return;
  }
  var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!req.body.email.match(mailformat)) {
    res.render('googleemail.ejs', { message: "'"+req.body.email+"' is not a valid email. Try again", google:req.user.google});
    return;
  }
  //ok! we have a valid email.  Write it into the local account, with the display name, and send an activation email
  //does this email already exist for an account? if so, and there is no twitter account for this user -- just link!
  //if this is so: reset authenticate to 0 to force authentication via the email account
  User.findOne({'local.email': req.body.email}, function(err, existingUser) {
    if (existingUser) {
      //if there is no google person reg'd with this local email -- just write the details there!
      if (!existingUser.google.token) {
        existingUser.google=req.user.google;
        existingUser.local.authenticated="0";
        User.findOne({'google.id': req.user.google.id}, function(err, deleteUser) {
          deleteUser.remove({});
        });
        existingUser.save();
        //log out current user; log in existingUser
        req.logout();
        req.logIn(existingUser, function (err) {
          if(!err){ res.redirect('/auth/profile'); } else{		//handle error
          } });
          return;
      }
      else {
        res.render('googleemail.ejs', { message: "There is already a Google account for the Textual Communities user identified by the email '"+req.body.email+"'. If you want to link this Google account to that account, log in with that email address, unlink the existing Google account and then link this Google account.", google:req.user.google});
        return;
      }
    }
    else {
      res.render('googleemail.ejs', { message: "There is no Textual Communities account identified by the email '"+req.body.email+"'. If you want to start a new account identified by that email, go back to the sign up screen.", google:req.user.google});
    }
  });
});
	//just set up a new account
router.get('/googlenew', function(req, res) {
    //we must make a new user!
//  console.log("before1 "+req.user);
  if (req.user.local.name) {
    var thisUser=new User();
    thisUser.google=req.user.google;
    req.user.google=undefined;
    req.user.save();
  } else {
    var thisUser=req.user;
  }
  console.log("before "+thisUser);
  thisUser.local.email=thisUser.google.email;
  thisUser.local.name=thisUser.google.name;
  thisUser.local.password=thisUser.generateHash("X"); //place holder
  thisUser.local.authenticated= "0";
  thisUser.save(function(err) {
    if (err) {}
    authenticateUser (thisUser.local.email, thisUser, req.protocol + '://' + req.get('host'));
    res.render('authenticate.ejs', {context:"google", user: thisUser});
    req.logout();
  });
  //now we send the email from here and here alone
});

//cancel this google linkage
router.get('/googlecancel', function(req, res) {
  User.findOne({'google.id': req.user.google.id}, function(err, deleteUser) {
    deleteUser.remove({});
  });
  res.render('closemodal.ejs', {url: "/app/home"});
});



// =============================================================================
// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
// =============================================================================

// facebook -------------------------------

router.get('/connect/callfacebook', function(req, res){
    TCModalState.state=3;
    //to be here; we must be logged in; so just write the facebook values into the local
    res.redirect('/auth/facebook')
  });



// twitter --------------------------------

// send to twitter to do the authentication
router.get('/connect/calltwitter', function(req, res){
    TCModalState.state=3;
    //to be here; we must be logged in; so just write the facebook values into the local
    res.redirect('/auth/twitter')
  });


// google ---------------------------------

// send to google to do the authentication
router.get('/connect/google', passport.authorize('google', { scope : ['profile', 'email'] }));

// the callback after google has authorized the user.. I don't think this called at all now
router.get('/connect/google/callback', passport.authorize('google', {
  successRedirect : '/#/profile',
  failureRedirect : '/'
}));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, remove
// cannot unlinke local

// facebook -------------------------------
router.get('/unlink/facebook', function(req, res) {
  var user            = req.user;
  user.facebook = undefined;
  user.save(function(err) {
    res.redirect('/auth/profile');
  });
});

// twitter --------------------------------
router.get('/unlink/twitter', function(req, res) {
  var user           = req.user;
  user.twitter = undefined;
  user.save(function(err) {
    res.redirect('/auth/profile');
  });
});

// google ---------------------------------
router.get('/unlink/google', function(req, res) {
  var user          = req.user;
  user.google.token = undefined;
  user.save(function(err) {
    res.redirect('/auth/profile');
  });
});

// =====================================
// LOGOUT ==============================
// =====================================
router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/app#/home');
});

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/app');
}


// route middleware to make sure our user has a primary email, for Twitter etc
//also check here for fb, google?: is this new account linked to a user when it is already linked to another local user?
//or do that later
function isValidProfile(user) {
//  console.log("who I am in authenticate: "+req.user);
  if (Object.keys(user.local).length===0 || typeof user.local.email === "undefined" || user.local.authenticated=="0") return false;
  return true;
}

var crypto = require('crypto');
var base64url = require('base64url');

/** Sync */
function randomStringAsBase64Url(size) {
  return base64url(crypto.randomBytes(size));
}

function authenticateUser (email, user, thisUrl) {
  var ejs = require('ejs'), fs = require('fs'), str = fs.readFileSync(__dirname + '/../views/authenticatemail.ejs', 'utf8');
  var hash=randomStringAsBase64Url(20);
  var rendered = ejs.render(str, {email:email, hash:hash, username:user.local.name, url: thisUrl});
  //console.log( TCAddresses.replyto+" "+TCAddresses.from);
//  console.log("here 2 "+user)
  user.local.timestamp=new Date().getTime();
  user.local.hash=hash;
  user.save();
  TCMailer.nodemailerMailgun.sendMail({
    from: TCAddresses.from,
    to: email,
    subject: 'Authenticate your Textual Communities account',
    'h:Reply-To': TCAddresses.replyto,
    html: rendered,
    text: rendered.replace(/<[^>]*>/g, '')
  }, function (err, info) {
    if (err) {console.log('Error: ' + err);}
  });
}


module.exports = router;
