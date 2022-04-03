import ngrok from 'ngrok';
import Debug from 'debug';

const debug = Debug('citizen:test:integration');

const connect = async (port) => {
  debug('try to connect ngrok', port);
  debug(process.env.NGROK_AUTHTOKEN.substr(0, 3));

  const url = await ngrok.connect({
    addr: port,
    authtoken: process.env.NGROK_AUTHTOKEN,
  });
  return new URL(url);
};

const disconnect = async () => {
  await ngrok.disconnect();
  await ngrok.kill();
};

export {
  connect,
  disconnect,
};
