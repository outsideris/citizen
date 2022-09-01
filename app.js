const path = require('path');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');

const logger = require('./lib/logger');
const index = require('./routes/index');
const serviceDiscovery = require('./routes/service-discovery');
const providers = require('./routes/providers');
const moduleList = require('./routes/list');
const modules = require('./routes/modules');
const moduleDownload = require('./routes/download');

const app = express();

app.use(helmet());
app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jten');

// uncomment after placing your favicon in /public
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', index);
app.use('/', serviceDiscovery);

app.use('/v1/providers', providers);

app.use('/v1/modules', moduleList);
app.use('/v1/modules', modules);
app.use('/v1/modules', moduleDownload);

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
}

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

module.exports = app;
