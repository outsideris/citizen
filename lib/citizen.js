/* eslint-disable no-console */
const commander = require('commander');
const Listr = require('listr');

const citizen = require('../package.json');
const {
  isValidNamespace, nameRule, isValidName, isValidVersion,
} = require('../lib/module');

let moduleNamespace;
let moduleName;
let moduleversion;

commander
  .command('publish <namespace> <name> <version>')
  .description('publish the terraform module')
  .action((namespace, name, version) => {
    moduleNamespace = namespace;
    moduleName = name;
    moduleversion = version;
  });

commander.version(citizen.version);
commander.usage('[command] [options]');
commander.parse(process.argv);

if (!isValidNamespace(moduleNamespace)) {
  console.error('The namespace only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.');
  process.exit(1);
}

if (!isValidName(moduleName)) {
  console.error('The name must be terraform-PROVIDER-NAME.');
  process.exit(1);
}

const moduleProvider = moduleName.match(nameRule)[1];
moduleName = moduleName.match(nameRule)[2]; // eslint-disable-line prefer-destructuring

// It must be semantic version.
moduleversion = isValidVersion(moduleversion);
if (!moduleversion) {
  console.error('The version must be a semantic version that can optionally be prefixed with a v. Examples are v1.0.4 and 0.9.2.');
  process.exit(1);
}

const tasks = new Listr([
  {
    title: `publish ${moduleNamespace}/${moduleName}/${moduleProvider}/${moduleversion}`,
    task: () => {},
  },
]);

tasks.run().catch((err) => {
  console.error(err);
});
