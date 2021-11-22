const path = require('path');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const json = require('morgan-json');

const app = express();

const logger = require('./lib/logger');

app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jten');
require('dotenv-flow').config({
  node_env: process.env.NODE_ENV || 'development',
});

// uncomment after placing your favicon in /public
if (process.env.NODE_ENV === 'production') {
  const format = json({
    timestamp: ':date[web]',
    method: ':method',
    url: ':url',
    status: ':status',
    length: ':res[content-length]',
    'response-time': ':response-time ms',
  });
  app.use(morgan(format, { skip(req, res) { return req.path === '/health' || req.path === '/favicon.ico' || req.path === '/.well-known/terraform.json'; } }));
} else {
  app.use(morgan(':date[web] :method :url :status'));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', require('./routes/index'));
app.use('/', require('./routes/service-discovery'));

app.use('/v1/providers', require('./routes/providers'));
app.use('/v1/providers', require('./routes/download'));
app.use('/v1/providers', require('./routes/list'));

app.use('/v1/modules', require('./routes/list'));
app.use('/v1/modules', require('./routes/modules'));
app.use('/v1/modules', require('./routes/download'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (!err.status || err.status >= 500) {
      logger.error(err.stack);
    }

    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err,
    });
  });
} else {
  // production error handler
  // no stacktraces leaked to user
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (!err.status || err.status >= 500) {
      logger.error(err.stack);
    }

    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {},
    });
  });
}

module.exports = app;
