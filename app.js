var express = require('express')
  , mongoose = require('mongoose')
  , path = require('path')
  , favicon = require('serve-favicon')
  , logger = require('morgan')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , flash = require('connect-flash')
  , session = require('express-session')
  , MongoStore = require('connect-mongo')(session)
  , _ = require('./common/mixin')
  , config = require('./config')
  , passport = require('./passport')
  , app = express()
;
var dburi = config.database.uri;
if(config.database.username != '' && config.database.password != '')
{
        dburi = 'mongodb://'+config.database.username+':'+config.database.password+'@'+config.database.host+'/'+config.database.database;
}
mongoose.connect(dburi);
//mongoose.connect(config.database.uri);

app.use(express.static(path.join(__dirname, 'public')));
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger(config.logFormat));

app.use(cookieParser());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// required for passport
app.use(session({
  key: 'session',
  secret: 'ilovescotchscotchyscotchscotch',
  store: new MongoStore({mongooseConnection: mongoose.connection}),
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash()); // use connect-flash for flash messages stored in session

app.use(bodyParser.json({
  limit: '50mb',
}));
app.use(bodyParser.raw({
  limit: '50mb',
}));
app.use(bodyParser.text({
  limit: '50mb',
}));
app.use(bodyParser.urlencoded({
  extended: false,
  limit: '50mb',
}));

app.use('/uri', require('./routes/uri'));
app.use('/api', require('./routes/api'));
app.use('/auth', require('./routes/auth'));
app.all('/app/*', function(req, res) {
  res.status(200).set({
    'content-type': 'text/html; charset=utf-8'
  }).sendFile(path.join(__dirname, 'public/index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(404).send('Page not found');
});

app.use(function logErrors(err, req, res, next) {
//  console.log(err);
  next(err);
});

// error handlers

// development error handler.
// will print stacktrace
if (config.DEBUG) {
  Error.stackTraceLimit = 10000;
}

const ErrorLog = mongoose.model('ErrorLog', {
  name: String,
  message: String,
  stack: String,
  created: Date,
});

app.use(function(err, req, res, next) {
  const error = {
    name: err.name,
    message: err.message,
    error: err,
    stack: err.stack,
  };
  try {
    let errorLog = new ErrorLog(_.assign({
      created: new Date(),
    }, _.omit(error, 'error')));
    errorLog.save();
  } catch (e) {
    console.log(e);
  }

  res.status(err.status || 500);
  if (config.DEBUG) {
    res.render('error', {
      name: err.name,
      message: err.message,
      error: err,
    });
  } else {
    res.render('error', _.pick(error, ['name', 'message',]));
  }
});

module.exports = app;
