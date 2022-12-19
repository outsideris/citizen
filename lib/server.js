const https = require('node:https');
const http = require('node:http');
var fs = require('node:fs');
const debug = require('debug')('citizen:server');

const app = require('../app');

const normalizePort = (val) => {
  const port = parseInt(val, 10);

  if (Number.isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
};

const createServer = () => {
  if (process.env.SERVER_TYPE === 'https') {
    const keyPath = process.env.TLS_KEY_PATH || 'tls/citizen.key'
    const crtPath = process.env.TLS_CRT_PATH || 'tls/citizen.crt'
    var options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(crtPath),
    };
    const port = normalizePort(process.env.PORT || '3443');
    console.log(`ListenType: https tlsKeyPath: ${keyPath} tlsCrtPath: ${crtPath} ListenPort: ${port}`)
    app.set('port', port);
    return { server: https.createServer(options, app), port: port };
  } else {
    const port = normalizePort(process.env.PORT || '3000');
    app.set('port', port);
    console.log(`ListenType: http ListenPort: ${port}`)
    return { server: http.createServer(app), port: port };
  }
}

const run = () => {
  const { server, port } = createServer()

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
};

module.exports = run;
