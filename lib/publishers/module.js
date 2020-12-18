const debug = require('debug');
const Listr = require('listr');

const {
  isValidNamespace,
  isValidName,
  isValidVersion,
  makeFileList,
  makeTarball,
  publish,
} = require('../module');

const owner = process.env.CITIZEN_MODULE_OWNER || '';
const registryAddr = process.env.CITIZEN_ADDR || 'http://127.0.0.1:3000';

module.exports = (namespace, name, provider, version, cmd) => {
  const verbose = debug('citizen:client');
  if (cmd.verbose) {
    debug.enable('citizen:client');
  }

  if (!isValidNamespace(namespace)) {
    console.error('The namespace only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.');
    process.exit(1);
  }

  if (!isValidName(name)) {
    console.error('The name only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.');
    process.exit(1);
  }

  if (!isValidName(provider)) {
    console.error('The provider only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.');
    process.exit(1);
  }
  // It must be semantic version.
  const moduleversion = isValidVersion(version);
  if (!moduleversion) {
    console.error('The version must be a semantic version that can optionally be prefixed with a v. Examples are v1.0.4 and 0.9.2.');
    process.exit(1);
  }

  const targetDir = process.cwd();
  const moduleFullPath = `${namespace}/${name}/${provider}/${moduleversion}`;

  const tasks = new Listr([
    {
      title: 'compress the terraform module',
      task: async (ctx) => {
        const files = await makeFileList(targetDir);
        verbose(`files to compress: ${files}`);
        const tarball = await makeTarball(targetDir, files);
        ctx.tarball = tarball;
      },
    },
    {
      title: `publish ${moduleFullPath}`,
      task: async (ctx) => {
        try {
          const res = await publish(registryAddr, moduleFullPath, ctx.tarball, owner);
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
