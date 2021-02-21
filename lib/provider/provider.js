const { post } = require('got');
const FormData = require('form-data');
const fs = require('fs');
const verbose = require('debug')('citizen:client');

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
  publish,
};
