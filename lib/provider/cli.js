/* eslint-disable no-console */
const fs = require('fs');
const debug = require('debug');
const ora = require('ora');
const { join } = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const {
  isValidNamespace,
  isValidType,
  isValidVersion,
  isValidProtocol,
} = require('../cli-helpers');
const {
  genShaSums,
  sign,
  exportPublicKey,
  publish,
} = require('./provider');

const readdir = promisify(fs.readdir);

const registryAddr = process.env.CITIZEN_ADDR || 'http://127.0.0.1:3000';

module.exports = async (namespace, type, version, protocols, cmd) => {
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
  if (!isValidVersion(version)) {
    console.error('The version must be a semantic version that can optionally be prefixed with a v. Examples are v1.0.4 and 0.9.2.');
    process.exit(1);
  }

  let protocolVersions;
  if (protocols) {
    protocolVersions = protocols.split(',');
    if (!protocolVersions.every((p) => isValidProtocol(p))) {
      console.error(`Wrong terraform protocol versions: ${protocols}`);
      console.error('The terraform protocol versions must be comma-separated MAJOR.MINOR format. Examples are 4.1,5.0.');
      process.exit(1);
    }
  }

  if (cmd.gpgKey) {
    try {
      await new Promise((resolve, reject) => {
        exec(`gpg --list-keys ${cmd.gpgKey}`, (err) => {
          if (err) { return reject(err); }
          return resolve();
        });
      });
    } catch (e) {
      console.error(`There is no public key for the GPG key ID(${cmd.gpgKey}) you provided`);
      process.exit(1);
    }
  }

  const targetDir = process.cwd();
  const spinner = ora();
  // validation step
  const fileNamePrefix = `${namespace}-${type}_${version}`;
  let providerData;
  try {
    spinner.text = `validate required files in ${targetDir}`;
    spinner.color = 'yellow';
    spinner.start();

    const files = await readdir(targetDir);
    const providerRegex = new RegExp(`${fileNamePrefix}_(?<os>.*)_(?<arch>.*).zip`);
    const providerArchives = files.filter((f) => f.match(providerRegex));

    if (providerArchives.length === 0) {
      spinner.fail();
      console.error(`There should be at least one zip archive matching file name ${namespace}-${type}_${version}_<os>_<arch>.zip`);
      process.exit(1);
    }

    providerData = {
      namespace,
      type,
      version,
      protocols: protocolVersions,
      platforms: [],
      gpgPublicKeys: [],
    };

    providerArchives.forEach((pa) => {
      const match = pa.match(providerRegex);

      providerData.platforms.push({
        filename: pa,
        os: match.groups.os,
        arch: match.groups.arch,
      });
    });
    spinner.succeed();
    console.log('  Found: ');
    providerData.platforms.forEach((p) => {
      console.log(`\t${p.filename}`);
    });
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

  // generating signature step
  let signatureFile;
  try {
    spinner.text = `sign ${fileNamePrefix}_SHA256SUMS file with gpg`;
    spinner.color = 'yellow';
    spinner.start();

    signatureFile = await sign(shaSumsFile, targetDir, cmd.gpgKey);

    spinner.succeed();
  } catch (err) {
    spinner.fail();
    console.error(err);
    process.exit(1);
  }

  // exporting gpg public key step
  try {
    spinner.text = `retriving GPG public key for ${cmd.gpgKeyg || 'your GPG'}`;
    spinner.color = 'yellow';
    spinner.start();

    const publicKey = await exportPublicKey(cmd.gpgKey);
    verbose('gpg public key:');
    verbose(publicKey);

    providerData.gpgPublicKeys.push({
      keyId: cmd.gpgKey,
      asciiArmor: publicKey,
    });

    spinner.succeed();
  } catch (err) {
    spinner.fail();
    console.error(err);
    process.exit(1);
  }

  // publishing step
  const providerFullPath = `${namespace}/${type}/${version}`;
  try {
    spinner.text = `publish ${providerFullPath}`;
    spinner.color = 'yellow';
    spinner.start();

    const files = providerData.platforms.map((p) => ({
      filename: p.filename,
      stream: fs.createReadStream(join(targetDir, p.filename)),
    }));
    files.push({
      filename: shaSumsFile,
      stream: fs.createReadStream(join(targetDir, shaSumsFile)),
    });
    files.push({
      filename: signatureFile,
      stream: fs.createReadStream(join(targetDir, signatureFile)),
    });

    const res = await publish(registryAddr, providerFullPath, providerData, files);
    verbose(`response status code form registry: ${res.statusCode}`);

    spinner.succeed();
  } catch (err) {
    spinner.fail();
    console.error(err.name);
    console.error(err.message);
    process.exit(1);
  }
};
