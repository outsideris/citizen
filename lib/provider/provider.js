const request = require('request');
const { promisify } = require('util');
const fs = require('fs');
const verbose = require('debug')('citizen:client');

const post = promisify(request.post);

const publish = async (registryAddr, providerPath, versions, sumsFile, signatureFile) => {
  verbose(`send post request to : ${registryAddr}/v1/providers/${providerPath}`);
  const formData = {
    os: versions.map((v) => v.os),
    arch: versions.map((v) => v.arch),
    sha256sums: {
      value: fs.createReadStream(sumsFile),
      options: {
        filename: sumsFile,
      },
    },
    signature: {
      value: fs.createReadStream(signatureFile),
      options: {
        filename: signatureFile,
      },
    },
    provider: versions.map((v) => ({
      value: fs.createReadStream(v.fileName),
      options: {
        filename: v.filename,
      },
    })),
  };

  const response = await post({
    url: `${registryAddr}/v1/providers/${providerPath}`,
    formData,
  });

  return response;
};

module.exports = {
  publish,
};
