const ngrok = require('ngrok');
const debug = require('debug')('citizen:test:integration');

const connect = async (port) => {
  debug('try to connect ngrok', port);

  const url = await ngrok.connect({
    addr: port,
    authtoken: process.env.NGROK_AUTHTOKEN,
  });
  debug('ngrok connected', url.host);
  return new URL(url);
};

const disconnect = async () => {
  debug('ngrok disconnected');
  await ngrok.disconnect();
  await ngrok.kill();
};

module.exports = {
  connect,
  disconnect,
};
