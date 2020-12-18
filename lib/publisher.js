const request = require('request');
const { promisify } = require('util');

const verbose = require('debug')('citizen:client');

const post = promisify(request.post);

const publish = async (registryAddr, publisher, force = false) => {
  verbose(`send post request to : ${registryAddr}/v1/publishers`, publisher);

  const body = publisher;

  const result = await post({
    url: `${registryAddr}/v1/publishers`,
    qs: {
      force,
    },
    headers: {
      'content-type': 'application/json',
    },
    json: body,
  });
  return result;
};

module.exports = {
  publish,
};
