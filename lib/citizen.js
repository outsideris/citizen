/* eslint-disable no-console */
const { format } = require('node:util');
const { join } = require('node:path');
const commander = require('commander');
const chalk = require('chalk');
const debug = require('debug');
const fse = require('fs-extra');

const publishModule = require('./module/cli');
const publishProvider = require('./provider/cli');
const server = require('./server');
const citizen = require('../package.json');

console.error = (msg, ...args) => {
  if (msg) {
    process.stderr.write(chalk.red(format(msg, ...args)));
  }
  console.log(); // new line
};

commander
  .command('module <namespace> <name> <provider> <version>')
  .option('-v, --verbose', 'Show more details')
  .option('-r, --registry <addr>', 'Specify registry address(same with CITIZEN_ADDR env var)')
  .option('-o, --owner <owner>', 'Specify module owner(same with CITIZEN_MODULE_OWNER env var)')
  .description('Publish the terraform module')
  .addHelpText(
    'after',
    `
Environment variables need to set:
* CITIZEN_ADDR : citizen registry server address to publish a module
* CITIZEN_MODULE_OWNER : module owner(optional)`,
  )
  .action(publishModule);

commander
  .command('provider <namespace> <type> <version> [protocols]')
  .option('-g, --gpg-key <gpgkey>', 'Specify your GPG key ID to sign your provider')
  .option('-v, --verbose', 'Show more details')
  .description('Publish the terraform provider')
  .addHelpText(
    'after',
    `
Environment variables need to set:
* CITIZEN_ADDR : citizen registry server address to publish a module`,
  )
  .action(publishProvider);

commander
  .command('server')
  .option('-v, --verbose', 'Show more details')
  .description('Run a terraform registry')
  .addHelpText(
    'after',
    `
Environment variables need to set:
* CITIZEN_STORAGE : storage type, file, s3 or gcs
* CITIZEN_STORAGE_PATH : directory to save module files if CITIZEN_STORAGE is file (absolute/relative path can be used).
* CITIZEN_STORAGE_BUCKET : bucket to save module/provider files if CITIZEN_STORAGE is s3 or gcs`,
  )
  .action((options) => {
    if (options.verbose) {
      debug.enable('citizen:server');
    }

    server();
  });

// TODO: 가이드 문서
commander
  .command('generate-migration')
  .description(
    'Generate migration files for database migration, see https://github.com/outsideris/citizen#database-migration for more details',
  )
  .action(async () => {
    const dbType = process.env.CITIZEN_DATABASE_TYPE;
    if (!dbType) {
      console.error('Please set DB type in CITIZEN_DATABASE_TYPE environment variable.');
      return;
    }

    if (dbType === 'mongodb') {
      console.log('MongoDB does not need migration.');
      return;
    }

    fse.copySync(join(__dirname, '..', `stores/${dbType}/${dbType}.prisma`), './schema.prisma', { overwrite: true });
    console.log('schema.prisma file generated.');
    fse.copySync(join(__dirname, '..', `stores/${dbType}/migrations`), './migrations', { overwrite: true });
    console.log('migrations directory generated.');
    console.log('To migrate database, You should prisma CLI.');
  });

commander.command('*', { noHelp: true }).action((options, cmd) => {
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
