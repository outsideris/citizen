const pino = require('pino');

const loggerName = process.env.npm_package_name || 'citizen';
const pretty = pino.pretty();
pretty.pipe(process.stdout);

const logger =
  process.env.NODE_ENV !== 'production' ?
    pino({ name: loggerName, level: 'error' }, pretty) :
    pino({ name: loggerName, level: 'error' });

module.exports = logger;
