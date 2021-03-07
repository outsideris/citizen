const https = require('https');
const fs = require('fs');
const { promisify } = require('util');
const { expect } = require('chai');
const { execFile } = require('child_process');
const { join } = require('path');
const rimraf = promisify(require('rimraf'));
const semver = require('semver');

const registry = require('./registry');
const { providerDb } = require('../../stores/store');
const { deleteDbAll, generateProvider } = require('../helper');
const { citizen } = require('../../package.json');

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

const TERRAFORM_VERSIONS = citizen.terraformVersions
  .map((version) => ({
    release: semver.parse(version).minor,
    version,
  }))
  // third-party provider supported in terraform 0.13+
  .filter((terraform) => terraform.release > 12);

TERRAFORM_VERSIONS.forEach((terraform) => {
  describe(`terraform CLI v${terraform.version} for provider`, () => {
    let url;
    let server;
    const targetDir = join(__dirname, 'fixture');
    const definitonFile = join(targetDir, 'tf-test.tf');
    const tfLockFile = join(targetDir, '.terraform.lock.hcl');
    const terraformCli = join(__dirname, '../', 'terraform-binaries', `terraform${terraform.release}`);

    before(async () => {
      const serverInfo = await registry.run();
      server = serverInfo.server;
      url = serverInfo.url;
      process.env.CITIZEN_ADDR = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
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

        const terraformDefinition = `provider "null" {
        }
        terraform {
          required_providers {
            null = {
              source  = "${url.host}/citizen-test/null"
              version = "0.1.0"
            }
          }
        }`;

        await writeFile(definitonFile, terraformDefinition, 'utf8');
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

      it('cli should init the registry server', (done) => {
        const cwd = join(__dirname, 'fixture');

        execFile(terraformCli, ['init'], { cwd }, (err, stdout, stderr) => {
          expect(stderr).to.include('Could not retrieve the list of available versions for provider');
          return done();
        });
      });
    });

    describe('with private the registry', () => {
      let tempDir;
      let cleanupProvider;

      before(async () => {
        const client = join(__dirname, '../', '../', 'bin', 'citizen');

        const result = await generateProvider('citizen-null_1.0.0', ['linux_amd64', 'windows_amd64', 'darwin_amd64']);
        [tempDir, cleanupProvider] = result;

        await new Promise((resolve, reject) => {
          execFile(client, ['provider', 'citizen', 'null', '1.0.0', '4.1,5.0'], { cwd: tempDir }, (err, stdout, stderr) => {
            if (err) { return reject(err); }
            console.log(stdout); // eslint-disable-line no-console
            console.log(stderr); // eslint-disable-line no-console
            return resolve();
          });
        });

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

        const content = definition
          .replace(/__PROVIDER_ADDRESS__/, `${url.host}/citizen/null`)
          .replace(/__PROVIDER_VERSION__/, '1.0.0');

        await writeFile(definitonFile, content, 'utf8');
      });

      after(async () => {
        cleanupProvider();
        await unlink(definitonFile);
        await rimraf(join(__dirname, 'fixture', '.terraform'));
        await deleteDbAll(providerDb());
        await rimraf(process.env.CITIZEN_STORAGE_PATH);
        try {
          await access(tfLockFile);
          await unlink(tfLockFile);
        } catch (ignore) {
          // ignored when there is no .terraform.lock.hcl under tf 0.13
        }
      });

      it('should download provider from registry', (done) => {
        const cwd = join(__dirname, 'fixture');

        execFile(terraformCli, ['init'], { cwd }, async (err, stdout) => {
          if (err) { return done(err); }

          expect(stdout).to.include('Terraform has been successfully initialized');
          await access(join(cwd, '.terraform'));
          return done();
        });
      });
    });
  });
});
