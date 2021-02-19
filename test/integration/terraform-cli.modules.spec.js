const https = require('https');
const fs = require('fs');
const { promisify } = require('util');
const { expect } = require('chai');
const getPort = require('get-port');
const { execFile } = require('child_process');
const { join } = require('path');
const rimraf = promisify(require('rimraf'));
const semver = require('semver');

const { connect, disconnect } = require('./ngrok');
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
  describe(`terraform CLI v${terraform.version}`, () => {
    let url;
    let server;
    const targetDir = join(__dirname, 'fixture');
    const definitonFile = join(targetDir, 'tf-test.tf');
    const terraformCli = join(__dirname, '../', 'terraform-binaries', `terraform${terraform.release}`);

    before(async () => {
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

      server = registry.run(port);
      process.env.CITIZEN_ADDR = `http://127.0.0.1:${port}`;
    });

    after(async () => {
      await disconnect();
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

        const terraformDefinition = `module "vpc" {
          source = "${url.host}/citizen-test/no-vpc/aws"
          version = "1.0.0"
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
            expect(data['modules.v1']).to.equal('/v1/modules/');
            done();
          });
        }).on('error', done);
      });

      it('cli should connect the registry server with terraform-cli', (done) => {
        const cwd = join(__dirname, 'fixture');

        execFile(terraformCli, ['get'], { cwd }, (err, stdout, stderr) => {
          expect(stderr).to.include('no versions');
          done();
        });
      });
    });

    describe('with private the registry', () => {
      before((done) => {
        const client = join(__dirname, '../', '../', 'bin', 'citizen');
        const moduleDir = join(__dirname, 'fixture', 'alb');

        const definition = `module "vpc" {
        source = "__MODULE_ADDRESS__"
        version = "__MODULE_VERSION__"
      }`;

        execFile(
          client,
          ['publish', 'module', 'citizen-test', 'alb', 'aws', '0.1.0'],
          { cwd: moduleDir },
          async (err) => {
            if (err) { return done(err); }

            const content = definition
              .replace(/__MODULE_ADDRESS__/, `${url.host}/citizen-test/alb/aws`)
              .replace(/__MODULE_VERSION__/, '0.1.0');
            await writeFile(definitonFile, content, 'utf8');
            return done();
          },
        );
      });

      after(async () => {
        await unlink(definitonFile);
        await rimraf(join(__dirname, 'fixture', '.terraform'));
        await deleteDbAll(moduleDb());
        await rimraf(process.env.CITIZEN_STORAGE_PATH);
      });

      it('should download module from registry', (done) => {
        const cwd = join(__dirname, 'fixture');

        execFile(terraformCli, ['get'], { cwd }, async (err, stdout) => {
          if (err) { return done(err); }

          try {
            expect(stdout).to.include('0.1.0');
            expect(stdout).to.include('vpc');
            await access(join(cwd, '.terraform'));
          } catch (e) {
            return done(e);
          }
          return done();
        });
      });
    });
  });
});
