import ngrok from 'ngrok';

const connect = async (port) => {
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
