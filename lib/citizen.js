const commander = require('commander');

const package = require('../package.json');

commander
  .command('publish <namespace> <name> <version>')
  .description('publish the terraform module');

commander.version(package.version);
commander.usage('[command] [options]');
commander.parse(process.argv);

console.log('trying to publish terraform module...');
