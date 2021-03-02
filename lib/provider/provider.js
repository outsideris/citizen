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

const sign = (shaSumsFile, targetDir) => new Promise((resolve, reject) => {
  exec(`gpg --detach-sign --yes ${shaSumsFile}`, { cwd: targetDir }, (err) => {
    if (err) {
      return reject(err);
    }
    return resolve(`${shaSumsFile}.sig`);
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
  });
  return result;
};

module.exports = {
  genShaSums,
  sign,
  publish,
};
