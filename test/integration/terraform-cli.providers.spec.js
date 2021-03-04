const https = require('https');
const fs = require('fs');
const { promisify } = require('util');
const { expect } = require('chai');
const { execFile } = require('child_process');
const { join } = require('path');
const rimraf = promisify(require('rimraf'));
const semver = require('semver');

const registry = require('./registry');
const { moduleDb } = require('../../stores/store');
const { deleteDbAll } = require('../helper');
const { citizen } = require('../../package.json');

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

const TERRAFORM_VERSIONS = citizen.terraformVersions.map((version) => ({
  release: semver.parse(version).minor,
  version,
}));

TERRAFORM_VERSIONS.forEach((terraform) => {
  describe.only(`terraform CLI v${terraform.version} for provider`, () => {
    let url;
    let server;
    const targetDir = join(__dirname, 'fixture');
    const definitonFile = join(targetDir, 'tf-test.tf');
    const terraformCli = join(__dirname, '../', 'terraform-binaries', `terraform${terraform.release}`);

    before(async () => {
      const serverInfo = await registry.run();
      server = serverInfo.server;
      url = serverInfo.url;
      process.env.CITIZEN_ADDR = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
      await registry.terminate(server);
      await deleteDbAll(moduleDb());
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
  });
});
