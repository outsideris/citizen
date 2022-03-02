import pino from 'pino';

const loggerName = process.env.npm_package_name || 'citizen';

const logger = pino({ name: loggerName, level: 'error' });

export default logger;
