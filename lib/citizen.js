/* eslint-disable no-console */
const { format } = require('util');
const commander = require('commander');
const Listr = require('listr');
const { red, yellow } = require('colors');

const citizen = require('../package.json');
const {
  isValidNamespace,
  nameRule,
  isValidName,
  isValidVersion,
  makeFileList,
  makeTarball,
  publish,
} = require('../lib/module');
const runServer = require('./server');

const owner = process.env.CITIZEN_MODULE_OWNER || '';
const registryAddr = process.env.CITIZEN_ADDR || 'http://127.0.0.1:3000';

console.error = (msg, ...args) => {
  if (msg) {
    process.stderr.write(red(format(msg, ...args)));
  }
  console.log(); // new line
};

const runPublish = (moduleNamespace, name, version, cmd) => {
  if (!isValidNamespace(moduleNamespace)) {
    console.error('The namespace only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.');
    process.exit(1);
  }

  if (!isValidName(name)) {
    console.error('The name must be terraform-PROVIDER-NAME.');
    process.exit(1);
  }

  const moduleProvider = name.match(nameRule)[1];
  const moduleName = name.match(nameRule)[2]; // eslint-disable-line prefer-destructuring

  // It must be semantic version.
  const moduleversion = isValidVersion(version);
  if (!moduleversion) {
    console.error('The version must be a semantic version that can optionally be prefixed with a v. Examples are v1.0.4 and 0.9.2.');
    process.exit(1);
  }

  global.verbose = (msg) => {
    if (cmd.verbose) {
      console.log(yellow(`verbose: ${msg}`));
    }
  };

  const targetDir = process.cwd();
  const moduleFullPath = `${moduleNamespace}/${moduleName}/${moduleProvider}/${moduleversion}`;

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

commander
  .command('publish <namespace> <name> <version>')
  .option('-v, --verbose', 'Show more details')
  .description('publish the terraform module')
  .action(runPublish);

commander
  .command('server')
  .description('run a terraform registry')
  .action(runServer);

commander
  .command('*', { noHelp: true })
  .action((env) => {
    console.error(`No command: ${env}`);
  });

commander.version(citizen.version);
commander.usage('[command] [options]');
commander.parse(process.argv);

// No speicified command
if (!process.argv.slice(2).length) {
  commander.outputHelp();
}
