const ngrok = require('ngrok');
const debug = require('debug')('citizen:test:integration');

const connect = async (port, version) => {
  debug(`v${version} try to connect ngrok`, port);

  const url = await ngrok.connect({
    addr: port,
    authtoken: process.env.NGROK_AUTHTOKEN,
  });
  debug(`v${version} ngrok connected`, url.host);
  return new URL(url);
};

const disconnect = async (version) => {
  debug(`v${version} ngrok disconnected`);
  await ngrok.disconnect();
  await ngrok.kill();
};

module.exports = {
  connect,
  disconnect,
};
