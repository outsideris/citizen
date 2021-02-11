/* eslint-disable no-console */
const fs = require('fs');
const debug = require('debug');
const Listr = require('listr');

const {
  isValidNamespace,
  isValidName,
  isValidVersion,
  publish,
} = require('../provider');

const registryAddr = process.env.CITIZEN_ADDR || 'http://127.0.0.1:3000';

module.exports = (namespace, type, version, cmd) => {
  const verbose = debug('citizen:client');
  if (cmd.verbose) {
    debug.enable('citizen:client');
  }

  if (!isValidNamespace(namespace)) {
    console.error('The namespace only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.');
    process.exit(1);
  }

  if (!isValidName(type)) {
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

  const tasks = new Listr([
    {
      title: `validate required files in ${targetDir}`,
      task: async (ctx) => {
        const fileNamePrefix = `terraform-provider-${type}_${version}`;
        const shaSumsFile = `${fileNamePrefix}_SHA256SUMS`;
        const signatureFile = `${shaSumsFile}.sig`;
        const files = fs.readdirSync(targetDir);
        const providerRegex = new RegExp(`${fileNamePrefix}_(?<os>.*)_(?<arch>.*).zip`);
        const providerArchives = files.filter((f) => f.match(providerRegex));

        if (providerArchives.length === 0) {
          throw new Error('There should be at least one zip archive matching file name terraform-provider-<type>_<version>_<os>_<arch>.zip ');
        }

        const providerVersions = providerArchives.map((pa) => {
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

        ctx.providerVersions = providerVersions;

        if (!fs.existsSync(shaSumsFile)) {
          throw new Error(`Sums file does not exist: ${shaSumsFile}`);
        }
        ctx.shaSumsFile = shaSumsFile;

        if (!fs.existsSync(signatureFile)) {
          throw new Error(`Signature file does not exist: ${signatureFile}`);
        }
        ctx.signatureFile = signatureFile;
      },
    },
    {
      title: `publish ${providerFullPath}`,
      task: async (ctx) => {
        try {
          const res = await publish(registryAddr, providerFullPath,
            ctx.providerVersions, ctx.shaSumsFile, ctx.signatureFile);

          verbose(`response status code form registry: ${res.statusCode}`);
          if (res.statusCode >= 400) {
            throw new Error(`The registry server is something wrong: ${res.statusMessage}`);
          }
        } catch (err) {
          if (err.code === 'ECONNREFUSED') {
            throw new Error('The registry server doesn\'t response. Please check the registry.');
          }
          throw err;
        }
      },
    },
  ]);

  tasks.run().catch((err) => {
    if (cmd.verbose) {
      console.error(err);
    }
  });
};
