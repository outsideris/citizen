import ngrok from 'ngrok';
import { parse } from 'url';

const connect = async (port) => {
  const url = await ngrok.connect({
    addr: port,
    onLogEvent: data => {
      console.log(data)
    }
  });
  return parse(url);
};

const disconnect = async () => {
  await ngrok.disconnect();
  await ngrok.kill();
};

export {
  connect,
  disconnect,
};
