const { post } = require('got');
const FormData = require('form-data');
const verbose = require('debug')('citizen:client');

const publish = async (registryAddr, modulePath, tarball, owner = '') => {
  verbose(`send post request to : ${registryAddr}/v1/modules/${modulePath}`);

  const form = new FormData();
  form.append('owner', owner);
  form.append('module', tarball, { filename: 'module.tar.gz' });

  const result = await post(`${registryAddr}/v1/modules/${modulePath}`, {
    body: form,
  });
  return result;
};

module.exports = {
  publish,
};
