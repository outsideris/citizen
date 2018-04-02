const ngrok = require('ngrok');
const { parse } = require('url');

const connect = async (port) => {
  const url = await ngrok.connect(port);
  return parse(url);
};

const disconnect = async () => {
  await ngrok.disconnect();
  await ngrok.kill();
};

module.exports = {
  connect,
  disconnect,
};
