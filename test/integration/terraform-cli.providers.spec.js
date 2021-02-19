const https = require('https');
const fs = require('fs');
const { promisify } = require('util');
const { expect } = require('chai');
const getPort = require('get-port');
const { execFile } = require('child_process');
const request = promisify(require('request'));
const { join } = require('path');

const execFilePromised = promisify(execFile);
const rimraf = promisify(require('rimraf'));

const { connect, disconnect } = require('./ngrok');
const registry = require('./registry');
const { providerDb } = require('../../stores/store');
const { deleteDbAll } = require('../helper');

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

const terraformDefinition = `provider "null" {
}
terraform {
  required_providers {
    null = {
      source = "__PROVIDER_ADDRESS__"
    }
  }
}
`;

describe('terraform CLI', () => {
  let url;
  let server;
  const targetDir = join(__dirname, 'fixture');
  const definitonFile = join(targetDir, 'tf-test.tf');
  const temp = join(__dirname, 'temp', 'providers');
  const citizenStoragePath = join(temp, 'storage');
  const terraformVersion = '0.13.0';
  const terraform = join(__dirname, 'temp', `terraform-${terraformVersion}`);

  before(function beforeTerraformCli(done) {
    this.timeout(20000);

    const download = join(__dirname, 'download-terraform');

    execFile(download, ['0.13.0'], async (err) => {
      if (err) { return done(err); }

      try {
        const port = await getPort();
        let exit = true;
        while (exit) {
          url = await connect(port); // eslint-disable-line
          // terraform handle URL which started with a numeric character
          // as local path, not registry server
          // see: https://github.com/hashicorp/terraform/pull/18039
          const startedWithNumeric = /^[0-9]/.test(url.host);

          if (!startedWithNumeric) {
            exit = false;
          } else {
            await disconnect(); // eslint-disable-line
          }
        }

        process.env.CITIZEN_ADDR = `http://127.0.0.1:${port}`;
        process.env.CITIZEN_STORAGE_PATH = citizenStoragePath;
        process.env.CITIZEN_DB_DIR = citizenStoragePath;

        server = registry.run(port);

        return done();
      } catch (e) {
        return done(e);
      }
    });
  });

  after(async () => {
    await disconnect();
    await registry.terminate(server);
    await deleteDbAll(providerDb());
  });

  describe('basic setup', () => {
    before(async () => {
      try {
        await mkdir(targetDir);
      } catch (ignore) {
        // ignored when targetDir already exist
      }

      const definition = terraformDefinition.replace(/__PROVIDER_ADDRESS__/, `${url.host}/citizen-test/null`);
      await writeFile(definitonFile, definition, 'utf8');
    });

    after(async () => {
      await unlink(definitonFile);
    });

    it('cli should connect the registry server', (done) => {
      https.get(`${url.href}.well-known/terraform.json`, (res) => {
        let data = '';
        res.on('data', (d) => {
          data += d;
        });

        res.on('end', () => {
          data = JSON.parse(data);
          expect(res.statusCode).to.equal(200);
          expect(data['providers.v1']).to.equal('/v1/providers/');
          done();
        });
      }).on('error', done);
    });

    it('cli should connect the registry server with terraform-cli', (done) => {
      const cwd = join(__dirname, 'fixture');

      execFile(terraform, ['init'], { cwd }, (err, stdout, stderr) => {
        expect(stderr).to.include('Could not retrieve the list of available versions for provider');
        done();
      });
    });
  });

  describe('with private the registry', function withPrivateTheRegistry() {
    this.timeout(5000);

    before(async function beforePrivateRegistryTests() {
      this.timeout(20000);
      const client = join(__dirname, '../', '../', 'bin', 'citizen');
      const providerDir = join(__dirname, 'fixture', 'provider');

      const definition = `provider "null" {
      }

      terraform {
        required_providers {
          null = {
            source = "__PROVIDER_ADDRESS__"
            version = "__PROVIDER_VERSION__"
          }
        }
      }`;

      await execFilePromised(
        join(__dirname, 'download-provider'),
        ['null', '1.0.0', join(__dirname, 'fixture', 'provider')],
      );

      await execFilePromised(
        client,
        ['publish', 'provider', 'citizen-test', 'null', '1.0.0', '-v'],
        { cwd: providerDir },
      );

      const content = definition
        .replace(/__PROVIDER_ADDRESS__/, `${url.host}/citizen-test/null`)
        .replace(/__PROVIDER_VERSION__/, '1.0.0');

      await writeFile(definitonFile, content, 'utf8');

      const publisherJsonPath = join(__dirname, 'fixture/provider/publisher.json');
      const publisherJson = fs.readFileSync(publisherJsonPath);

      return request({
        url: `${url.href}v1/publishers`,
        method: 'POST',
        json: JSON.parse(publisherJson),
      });
    });

    after(async () => {
      await unlink(definitonFile);
      await rimraf(join(__dirname, 'fixture', '.terraform'));
      await deleteDbAll(providerDb());
      await rimraf(process.env.CITIZEN_STORAGE_PATH);
    });

    it('should download provider from registry', function itShouldDownloadFromProviderRegistry(done) {
      this.timeout(10000);
      const cwd = join(__dirname, 'fixture');

      execFile(terraform, ['init'], { cwd }, async (err, stdout) => {
        if (err) {
          return done(err);
        }

        expect(stdout).to.include(`Installed ${url.host}/citizen-test/null v1.0.0 (signed by HashiCorp)`);
        expect(stdout).to.include('Terraform has been successfully initialized');
        await access(join(cwd, '.terraform'));
        return done();
      });
    });
  });
});
