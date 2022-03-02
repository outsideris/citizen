import path from 'path';
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { fileURLToPath } from 'url';

const app = express();

import logger from './lib/logger.js';

app.use(helmet());

// view engine setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jten');

// uncomment after placing your favicon in /public
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

import index from './routes/index.js';
import serviceDiscovery from './routes/service-discovery.js';
app.use('/', index);
app.use('/', serviceDiscovery);

import providers from './routes/providers.js';
import providerDownload from './routes/download.js';
import providerList from './routes/list.js';
app.use('/v1/providers', providers);
app.use('/v1/providers', providerDownload);
app.use('/v1/providers', providerList);

import moduleList from './routes/list.js';
import modules from './routes/modules.js';
import moduleDownload from './routes/download.js';
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

export default app;
