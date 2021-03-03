const { post } = require('got');
const FormData = require('form-data');
const { exec } = require('child_process');
const verbose = require('debug')('citizen:client');

const genShaSums = (fileNamePrefix, targetDir) => new Promise((resolve, reject) => {
  exec(`shasum -a 256 *.zip > ${fileNamePrefix}_SHA256SUMS`, { cwd: targetDir }, (err) => {
    if (err) {
      return reject(err);
    }
    return resolve(`${fileNamePrefix}_SHA256SUMS`);
  });
});

const sign = (shaSumsFile, targetDir, gpgKey) => new Promise((resolve, reject) => {
  let keyOption = '';
  if (gpgKey) {
    keyOption = `--default-key ${gpgKey} `;
  }
  exec(`gpg --detach-sign ${keyOption} --yes ${shaSumsFile}`, { cwd: targetDir }, (err) => {
    if (err) {
      return reject(err);
    }
    return resolve(`${shaSumsFile}.sig`);
  });
});

const exportPublicKey = (gpgKey) => new Promise((resolve, reject) => {
  let keyId = '';
  if (gpgKey) {
    keyId = gpgKey;
  }
  exec(`gpg --export --armor ${keyId}`, (err, stdout, stderr) => {
    if (err) { return reject(err); }
    if (stderr) { return reject(stderr); }

    return resolve(stdout);
  });
});

const publish = async (registryAddr, providerPath, data, files) => {
  verbose(`send post request to : ${registryAddr}/v1/providers/${providerPath}`);

  const form = new FormData();
  form.append('data', JSON.stringify(data));
  files.forEach((f, index) => {
    form.append(`file${index + 1}`, f.stream, { filename: f.filename });
  });

  const result = await post(`${registryAddr}/v1/providers/${providerPath}`, {
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
              error.name = `Duplicated (${response.statusCode})`;
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
  genShaSums,
  sign,
  exportPublicKey,
  publish,
};
