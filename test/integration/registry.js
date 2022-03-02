import http from 'http';
import getPort from 'get-port';
import Debug from 'debug';

import { connect, disconnect } from './ngrok.js';
import app from '../../app.js';

const debug = Debug('citizen:test:integration');

const run = async () => {
  let url;
  const port = await getPort();
  let exit = true;
  while (exit) {
    url = await connect(port); // eslint-disable-line
    // terraform handle URL which started with a numeric character
    // as local path, not registry server
    // see: https://github.com/hashicorp/terraform/pull/18039
    const startedWithNumeric = /^[0-9]/.test(url.host);
    if (!startedWithNumeric) {
      exit = false;
    } else {
      await disconnect(); // eslint-disable-line
    }
  }
  app.set('port', port);

  const server = http.createServer(app);
  server.listen(port);
  server.on('error', (error) => {
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

  return {
    server,
    url,
  };
};

const terminate = (server) => new Promise((resolve, reject) => {
  disconnect()
    .then(() => {
      server.close((err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
});

export {
  run,
  terminate,
};
