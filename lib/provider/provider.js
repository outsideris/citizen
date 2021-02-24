const { post } = require('got');
const FormData = require('form-data');
const fs = require('fs');
const { exec } = require('child_process');
const verbose = require('debug')('citizen:client');

const genShaSums = (fileNamePrefix, targetDir) => new Promise((resolve, reject) => {
  exec(`shasum -a 256 *.zip > ${fileNamePrefix}_SHA256SUMS`, { cwd: targetDir }, (err, stdout, stderr) => {
    if (err) {
      return reject(err);
    }
    resolve(`${fileNamePrefix}_SHA256SUMS`);
  });
});

const sign = (shaSumsFile, targetDir) => new Promise((resolve, reject) => {
  exec(`gpg --detach-sign --yes ${shaSumsFile}`, { cwd: targetDir }, (err, stdout, stderr) => {
    if (err) {
      return reject(err);
    }
    resolve(`${shaSumsFile}.sig`);
  });
});

const publish = async (registryAddr, providerPath, versions, sumsFile, signatureFile) => {
  verbose(`send post request to : ${registryAddr}/v1/providers/${providerPath}`);

  const form = new FormData();
  form.append('os', versions.map((v) => v.os));
  form.append('arch', versions.map((v) => v.arch));
  form.append('sha256sums', fs.createReadStream(sumsFile), { filename: sumsFile });
  form.append('signature', fs.createReadStream(signatureFile), { filename: signatureFile });
  form.append('signature', versions.map((v) => fs.createReadStream(v.fileName)), { filename: versions.map((v) => v.fileName) });

  const result = await post(`${registryAddr}/v1/providers/${providerPath}`, {
    body: form
  });
  return result;
};

module.exports = {
  genShaSums,
  sign,
  publish,
};
