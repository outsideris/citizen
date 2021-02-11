/* eslint-disable no-console */
const gpg = require('gpg');
const debug = require('debug');
const Listr = require('listr');
const { promisify } = require('util');

const {
  publish,
} = require('../publisher');

const registryAddr = process.env.CITIZEN_ADDR || 'http://127.0.0.1:3000';

module.exports = (gpgKeyId, cmd) => {
  const verbose = debug('citizen:client');
  if (cmd.verbose) {
    debug.enable('citizen:client');
  }

  if (!gpgKeyId) {
    console.error('Gpg Key ID must be provided.');
    process.exit(1);
  }

  const gpgCall = promisify(gpg.call);

  const tasks = new Listr([
    {
      title: `validate gpg key ${gpgKeyId}`,
      task: async (ctx) => {
        const gpgKeyResponse = await gpgCall('', ['--list-keys', gpgKeyId]);
        if (gpgKeyResponse.toString().indexOf(gpgKeyId) === -1) {
          throw new Error(`GPG Key with ID ${gpgKeyId} was not found`);
        }

        const nameRegex = /uid.*]\s*(?<name>.*)\s*/i;
        const nameMatch = gpgKeyResponse.toString().match(nameRegex);
        const { name } = nameMatch.groups;

        if (!nameMatch) {
          throw new Error('Could not extract the name from the GPG Key Response');
        }

        const keyResponse = await gpgCall('', ['--export', '--armor', gpgKeyId]);
        const asciiArmor = keyResponse.toString();

        const gpgKeys = [{
          keyId: gpgKeyId,
          asciiArmor,
        }];

        ctx.publisher = {
          name,
          gpgKeys,
        };
      },
    },
    {
      title: 'publish provider publisher',
      task: async (ctx) => {
        try {
          const res = await publish(registryAddr, ctx.publisher, cmd.force);

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
