var express = require('express')
  , _ = require('./utils/mixin')
  , mongoose = require('mongoose')
  , Promise = mongoose.Promise
  , path = require('path')
  , app = express()
  , favicon = require('serve-favicon')
  , logger = require('morgan')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , flash = require('connect-flash')
  , session = require('express-session')
  , config = require('./config')
  , passport = require('./passport')
;

mongoose.connect(config.database.uri);

app.use(bodyParser.json({
  limit: '20mb',
}));
app.use(bodyParser.raw({
  limit: '20mb',
}));
app.use(bodyParser.text({
  limit: '20mb',
}));
app.use(bodyParser.urlencoded({
  extended: false,
  limit: '20mb',
}));
app.use(cookieParser());
//app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));

// required for passport
app.use(session({ secret: 'ilovescotchscotchyscotchscotch' }));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

app.use('/api', require('./routes/api'));
app.use('/auth', require('./routes/auth'));
app.all('/app/*', function(req, res) {
  res.status(200).set({
    'content-type': 'text/html; charset=utf-8'
  }).sendFile(path.join(__dirname, 'public/t.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler.
// will print stacktrace
if (app.get('env') === 'development') {
  Error.stackTraceLimit = 100;
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;

