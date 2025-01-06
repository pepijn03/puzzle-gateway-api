var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var usersRouter = require('./login-router');
var indexRouter = require('./index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));

app.use('/', indexRouter);
app.use('/auth', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler with improved error response
app.use(function(err, req, res, next) {
  // Log the error for server-side tracking
  console.error(err);

  // Determine error status and message
  const status = err.status || 500;
  const errorMessage = err.message || 'Internal Server Error';

  // Send detailed error response in development, generic in production
  res.status(status).json({
    code: status,
    status: 'Error',
    message: req.app.get('env') === 'development' ? errorMessage : 'An unexpected error occurred',
    error: req.app.get('env') === 'development' ? err : {}
  });
});

module.exports = app;