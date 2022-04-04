const pino = require('pino');

const loggerName = process.env.npm_package_name || 'citizen';

const logger = pino({ name: loggerName, level: 'error' });

module.exports = logger;
