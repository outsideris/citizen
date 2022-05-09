const semver = require('semver');

const { citizen } = require('../package.json');

const TERRAFORM_VERSIONS = citizen.terraformVersions.map((version) => ({
  release: `${semver.parse(version).major}.${semver.parse(version).minor}`,
  version,
}));

module.exports = TERRAFORM_VERSIONS;
