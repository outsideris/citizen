const pino = require('pino');

const loggerName = process.env.npm_package_name || 'citizen';

const options = {
  name: loggerName,
  level: process.env.LOG_LEVEL || 'error',
};

if (!process.pkg && process.env.NODE_ENV === 'development') {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  };
}

const logger = pino(options);

module.exports = logger;
