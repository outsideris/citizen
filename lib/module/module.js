const got = require('got');
const FormData = require('form-data');
const debug = require('debug')('citizen:client');

const publish = async (registryAddr, modulePath, tarball, owner = '') => {
  debug(`send post request to : ${registryAddr}/v1/modules/${modulePath}`);

  const form = new FormData();
  form.append('owner', owner);
  form.append('module', tarball, { filename: 'module.tar.gz' });

  const result = await got.post(`${registryAddr}/v1/modules/${modulePath}`, {
    body: form,
    hooks: {
      beforeError: [
        (error) => {
          /* eslint-disable no-param-reassign */
          if (error.code === 'ECONNREFUSED') {
            error.message = 'The registry server doesn\'t response. Please check the registry.';
          } else {
            const { response } = error;
            if (response && response.body) {
              const { errors } = JSON.parse(response.body);
              error.name = `${error.name} (${response.statusCode})`;
              error.message = errors.map((msg) => `${msg}`).join('\n');
            }
          }
          return error;
          /* eslint-enable no-param-reassign */
        },
      ],
    },
  });
  return result;
};

module.exports = {
  publish,
};
