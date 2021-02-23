/* eslint-disable no-console */
const fs = require('fs');
const debug = require('debug');
const ora = require('ora');
const { promisify } = require('util');

const { isValidNamespace, isValidType , isValidVersion,
} = require('../cli-helpers');
const { genShaSums, publish } = require('./provider');

const readdir = promisify(fs.readdir);

const registryAddr = process.env.CITIZEN_ADDR || 'http://127.0.0.1:3000';

module.exports = async (namespace, type, version, cmd) => {
  const verbose = debug('citizen:client');
  if (cmd.verbose) {
    debug.enable('citizen:client');
  }

  if (!isValidNamespace(namespace)) {
    console.error('The namespace only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.');
    process.exit(1);
  }

  if (!isValidType(type)) {
    console.error('The type only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.');
    process.exit(1);
  }

  // It must be semantic version.
  const providerVersion = isValidVersion(version);
  if (!providerVersion) {
    console.error('The version must be a semantic version that can optionally be prefixed with a v. Examples are v1.0.4 and 0.9.2.');
    process.exit(1);
  }

  const targetDir = process.cwd();
  const providerFullPath = `${namespace}/${type}/${providerVersion}`;

  const spinner = ora();
  // validation step
  const fileNamePrefix = `terraform-provider-${type}_${version}`;
  const signatureFile = `${shaSumsFile}.sig`;
  let providerVersions;
  try {
    spinner.text = `validate required files in ${targetDir}`;
    spinner.color = 'yellow';
    spinner.start();

    const files = await readdir(targetDir);
    const providerRegex = new RegExp(`${fileNamePrefix}_(?<os>.*)_(?<arch>.*).zip`);
    const providerArchives = files.filter((f) => f.match(providerRegex));

    if (providerArchives.length === 0) {
      spinner.fail();
      console.error('There should be at least one zip archive matching file name terraform-provider-<type>_<version>_<os>_<arch>.zip');
      process.exit(1);
    }

    providerVersions = providerArchives.map((pa) => {
      const match = pa.match(providerRegex);
      return {
        fileName: pa,
        namespance: namespace,
        type,
        version,
        os: match.groups.os,
        arch: match.groups.arch,
      };
    });
    spinner.succeed();
  } catch (err) {
    spinner.fail();
    console.error(err);
    process.exit(1);
  }

  // generating shasums step
  let shaSumsFile;
  try {
    spinner.text = `generate ${fileNamePrefix}_SHA256SUMS file`;
    spinner.color = 'yellow';
    spinner.start();

    shaSumsFile = await genShaSums(fileNamePrefix, targetDir);

    spinner.succeed();
  } catch (err) {
    spinner.fail();
    console.error(err);
    process.exit(1);
  }

  if (!fs.existsSync(signatureFile)) {
    spinner.fail();
    console.error(`Signature file does not exist: ${signatureFile}`);
    process.exit(1);
  }

  // publishing step
  try {
    spinner.text = `publish ${providerFullPath}`;
    spinner.color = 'yellow';
    spinner.start();

    const res = await publish(registryAddr, providerFullPath,
      providerVersions, shaSumsFile, signatureFile);

    verbose(`response status code form registry: ${res.statusCode}`);
    if (res.statusCode >= 400) {
      const { errors } = JSON.parse(res.body);
      spinner.fail();
      console.error(`The registry server is something wrong: ${errors.map((msg) => `\n${msg}`)}`);
      process.exit(1);
    }

    spinner.succeed();
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      spinner.fail();
      console.error('The registry server doesn\'t response. Please check the registry.');
      process.exit(1);
    }

    spinner.fail();
    console.error(err);
    process.exit(1);
  }
};
