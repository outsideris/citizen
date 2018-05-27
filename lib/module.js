const globby = require('globby');
const tar = require('tar');
const semver = require('semver');
const request = require('request');
const { promisify } = require('util');
const verbose = require('debug')('citizen:client');

const post = promisify(request.post);

// The module must adhere to the requirements of terraform module.
// ref: https://www.terraform.io/docs/registry/modules/publish.html?#requirements

// The namespace follows username rule of github
// only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen
const namespaceRule = /^[a-zA-Z0-9]+-?[a-zA-Z0-9]+$/;
const isValidNamespace = namespace => namespaceRule.test(namespace);

// The name rule is
// alphanumeric characters or single hyphens, and cannot begin or end with a hyphen
const nameRule = /^[a-zA-Z0-9]+-?[a-zA-Z0-9]+$/;
const isValidName = name => nameRule.test(name);

// The version must be semantic version.
const isValidVersion = version => semver.valid(version);

const makeFileList = async (target = __dirname) => {
  const filelist = await globby(['**'], {
    cwd: target,
    gitignore: true,
  });
  return filelist;
};

const makeTarball = (target = __dirname, filelist = []) =>
  new Promise((resolve, reject) => {
    const compressed = tar.create(
      {
        cwd: target,
        gzip: true,
      },
      filelist,
    );
    const buffers = [];

    compressed
      .on('data', (chunk) => {
        buffers.push(chunk);
      })
      .on('end', () => {
        resolve(Buffer.concat(buffers));
      })
      .on('error', (err) => {
        reject(err);
      });
  });

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
  isValidNamespace,
  isValidName,
  isValidVersion,
  makeFileList,
  makeTarball,
  publish,
};
