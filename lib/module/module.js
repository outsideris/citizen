const request = require('request');
const { promisify } = require('util');
const verbose = require('debug')('citizen:client');

const post = promisify(request.post);

const publish = async (registryAddr, modulePath, tarball, owner = '') => {
  verbose(`send post request to : ${registryAddr}/v1/modules/${modulePath}`);
  const result = await post({
    url: `${registryAddr}/v1/modules/${modulePath}`,
    formData: {
      owner,
      module: {
        value: tarball,
        options: {
          filename: 'module.tar.gz',
        },
      },
    },
  });
  return result;
};

module.exports = {
  publish,
};
