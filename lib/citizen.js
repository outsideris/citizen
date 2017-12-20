/* eslint-disable no-console */
const commander = require('commander');
const semver = require('semver');
const Listr = require('listr');

const citizen = require('../package.json');

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

// The module must adhere to the requirements of terraform module.
// ref: https://www.terraform.io/docs/registry/modules/publish.html?#requirements

// follow username rule of github
// only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen
const namespaceRule = /^[a-zA-Z0-9]+-?[a-zA-Z0-9]+$/;
const checkNamespace = namespace => namespaceRule.test(namespace);

if (!checkNamespace(moduleNamespace)) {
  console.error('The namespace only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.');
  process.exit(1);
}

// It must be terraform-PROVIDER-NAME.
const nameRule = /^terraform-([a-zA-Z0-9]+)-([a-zA-Z0-9]+)$/;
const checkName = name => nameRule.test(name);
if (!checkName(moduleName)) {
  console.error('The name must be terraform-PROVIDER-NAME.');
  process.exit(1);
}

const moduleProvider = moduleName.match(nameRule)[1];
moduleName = moduleName.match(nameRule)[2]; // eslint-disable-line prefer-destructuring

// It must be semantic version.
if (!semver.valid(moduleversion)) {
  console.error('The version must be a semantic version that can optionally be prefixed with a v. Examples are v1.0.4 and 0.9.2.');
  process.exit(1);
}

moduleversion = semver.valid(moduleversion);

const tasks = new Listr([
  {
    title: `publish ${moduleNamespace}/${moduleName}/${moduleProvider}/${moduleversion}`,
    task: () => {},
  },
]);

tasks.run().catch((err) => {
  console.error(err);
});
