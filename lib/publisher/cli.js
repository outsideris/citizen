/* eslint-disable no-console */
const gpg = require('gpg');
const debug = require('debug');
const ora = require('ora');
const { promisify } = require('util');

const {
  publish,
} = require('./publisher');

const registryAddr = process.env.CITIZEN_ADDR || 'http://127.0.0.1:3000';

module.exports = async (gpgKeyId, cmd) => {
  const verbose = debug('citizen:client');
  if (cmd.verbose) {
    debug.enable('citizen:client');
  }

  if (!gpgKeyId) {
    console.error('Gpg Key ID must be provided.');
    process.exit(1);
  }

  const gpgCall = promisify(gpg.call);

  const spinner = ora();
  // validation step
  let publisher;
  try {
    spinner.text = `validate gpg key ${gpgKeyId}`;
    spinner.color = 'yellow';
    spinner.start();

    const gpgKeyResponse = await gpgCall('', ['--list-keys', gpgKeyId]);
    if (gpgKeyResponse.toString().indexOf(gpgKeyId) === -1) {
      spinner.fail();
      console.error(`GPG Key with ID ${gpgKeyId} was not found`);
      process.exit(1);
    }

    const nameRegex = /uid.*]\s*(?<name>.*)\s*/i;
    const nameMatch = gpgKeyResponse.toString().match(nameRegex);
    const { name } = nameMatch.groups;

    if (!nameMatch) {
      spinner.fail();
      console.error('Could not extract the name from the GPG Key Response');
      process.exit(1);
    }

    const keyResponse = await gpgCall('', ['--export', '--armor', gpgKeyId]);
    const asciiArmor = keyResponse.toString();

    const gpgKeys = [{
      keyId: gpgKeyId,
      asciiArmor,
    }];

    publisher = {
      name,
      gpgKeys,
    };

    spinner.succeed();
  } catch (err) {
    spinner.fail();
    console.error(err);
    process.exit(1);
  }

  // publishing step
  try {
    spinner.text = 'publish provider publisher';
    spinner.color = 'yellow';
    spinner.start();

    const res = await publish(registryAddr, publisher, cmd.force);

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
