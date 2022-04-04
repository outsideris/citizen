const http = require('http');
const getPort = require('get-port');
const debug = require('debug')('citizen:test:integration');

const { connect, disconnect } = require('./ngrok');
const app = require('../../app');

const run = async (version) => {
  let url;
  const port = await getPort();
  let exit = true;
  let retried = 0;
  while (exit) {
    try {
      retried += 1;
      url = await connect(port, version); // eslint-disable-line
      // terraform handle URL which started with a numeric character
      // as local path, not registry server
      // see: https://github.com/hashicorp/terraform/pull/18039
      const startedWithNumeric = /^[0-9]/.test(url.host);
      if (!startedWithNumeric) {
        exit = false;
      } else {
        await disconnect(version); // eslint-disable-line
      }
    } catch (e) {
      if (retried > 15) {
        exit = false;
      }
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

module.exports = {
  run,
  terminate,
};
