/* eslint-disable no-console */
const { format } = require('util');
const commander = require('commander');

const { red } = require('chalk');
const debug = require('debug');

const citizen = require('../package.json');

const publishModule = require('./module/cli');
const publishProvider = require('./provider/cli');

const server = require('./server');

console.error = (msg, ...args) => {
  if (msg) {
    process.stderr.write(red(format(msg, ...args)));
  }
  console.log(); // new line
};

commander
  .command('module <namespace> <name> <provider> <version>')
  .option('-v, --verbose', 'Show more details')
  .option('-r, --registry <addr>', 'Specify registry address(same with CITIZEN_ADDR env var)')
  .option('-o, --owner <owner>', 'Specify module owner(same with CITIZEN_MODULE_OWNER env var)')
  .description('Publish the terraform module')
  .addHelpText('after', `
Environment variables need to set:
* CITIZEN_ADDR : citizen registry server address to publish a module
* CITIZEN_MODULE_OWNER : module owner(optional)`)
  .action(publishModule);

commander
  .command('provider <namespace> <type> <version> [protocols]')
  .option('-g, --gpg-key <gpgkey>', 'Specify your GPG key ID to sign your provider')
  .option('-v, --verbose', 'Show more details')
  .description('Publish the terraform provider')
  .addHelpText('after', `
Environment variables need to set:
* CITIZEN_ADDR : citizen registry server address to publish a module`)
  .action(publishProvider);

commander
  .command('server')
  .option('-v, --verbose', 'Show more details')
  .description('Run a terraform registry')
  .addHelpText('after', `
Environment variables need to set:
* CITIZEN_STORAGE : storage type, file or s3
* CITIZEN_STORAGE_PATH : directory to save module files if CITIZEN_STORAGE is file (absolute/relative path can be used).
* CITIZEN_AWS_S3_BUCKET : s3 bucket to save module files if CITIZEN_STORAGE is s3
* AWS_ACCESS_KEY_ID : your AWS access key if CITIZEN_STORAGE is s3
* AWS_SECRET_ACCESS_KEY : your AWS secret access key if CITIZEN_STORAGE is s3`)
  .action((options) => {
    if (options.verbose) {
      debug.enable('citizen:server');
    }

    server();
  });

commander
  .command('*', { noHelp: true })
  .action((options, cmd) => {
    console.error(`No command: ${cmd.args[0]}`);
  });

commander.version(citizen.version);
commander.usage('[command] [options]');
commander.addHelpCommand(false);
commander.parseAsync(process.argv);

// No speicified command
if (!process.argv.slice(2).length) {
  commander.outputHelp();
}
