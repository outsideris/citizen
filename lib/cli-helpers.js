const globby = require('globby');
const tar = require('tar');
const semver = require('semver');

// The module must adhere to the requirements of terraform module.
// ref: https://www.terraform.io/docs/registry/modules/publish.html?#requirements

// The namespace follows username rule of github
// only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen
const namespaceRule = /^[a-zA-Z0-9]+-?[a-zA-Z0-9]+$/;
const isValidNamespace = (namespace) => namespaceRule.test(namespace);

// The Module name rule is
// alphanumeric characters or single underscores, and cannot begin or end with a hyphen
const moduleNameRule = /^[0-9A-Za-z](?:[0-9A-Za-z-_]{0,62}[0-9A-Za-z])?$/;
const isValidModuleName = (name) => moduleNameRule.test(name);

// The name rule is
// alphanumeric characters or single hyphens, and cannot begin or end with a hyphen
const providerNameRule = /^[a-zA-Z0-9]+-?[a-zA-Z0-9]+$/;
const isValidProviderName = (name) => providerNameRule.test(name);

// The version must be semantic version.
const isValidVersion = (version) => semver.valid(version);

// The protocol version must be MAJOR.MINOR format.
// see https://www.terraform.io/docs/internals/provider-registry-protocol.html#response-properties
const protocolRule = /^[0-9]\.[0-9]$/;
const isValidProtocol = (version) => protocolRule.test(version);

const makeFileList = async (target = __dirname) => {
  const filelist = await globby(['**'], {
    cwd: target,
    gitignore: true,
  });
  return filelist;
};

const makeTarball = (target = __dirname, filelist = []) => new Promise((resolve, reject) => {
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

module.exports = {
  isValidNamespace,
  isValidModuleName,
  isValidProviderName,
  isValidType: isValidProviderName,
  isValidVersion,
  isValidProtocol,
  makeFileList,
  makeTarball,
};
