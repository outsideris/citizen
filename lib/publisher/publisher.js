const { post } = require('got');

const verbose = require('debug')('citizen:client');

const publish = async (registryAddr, publisher, force = false) => {
  verbose(`send post request to : ${registryAddr}/v1/publishers`, publisher);

  const body = publisher;
  const result = await post(`${registryAddr}/v1/publishers`, {
    json: body,
    responseType: 'json'
  });
  return result;
};

module.exports = {
  publish,
};
