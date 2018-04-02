const app = require('../../app');
const https = require('https');
const { readFileSync } = require('fs');
const { join } = require('path');
const debug = require('debug')('test:integration');

const httpsOptions = {
  key: readFileSync(join(__dirname, './key.pem')),
  cert: readFileSync(join(__dirname, './cert.pem')),
};

const runServer = () => {
  const port = 443;
  app.set('port', port);

  const server = https.createServer(httpsOptions, app);
  server.listen(port);
  server.on('error', (error) => {
    console.log(error);
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`); // eslint-disable-line no-console
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`); // eslint-disable-line no-console
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
  server.on('listening', () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    debug(`Listening on ${bind}`);
  });
};

module.exports = runServer;

runServer();
