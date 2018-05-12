const https = require('https');
const fs = require('fs');
const { promisify } = require('util');
const { expect } = require('chai');
const getPort = require('get-port');
const { execFile } = require('child_process');
const { join } = require('path');

const { connect, disconnect } = require('./ngrok');
const registry = require('./registry');

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

const terraformDefinition = `module "vpc" {
  source = "__MODULE_ADDRESS__"
}`;

describe('terraform CLI', () => {
  let url;
  let server;
  const targetDir = join(__dirname, 'fixture');
  const definitonFile = join(targetDir, 'tf-test.tf');
  const terraform = join(__dirname, 'temp', 'terraform');

  before((done) => {
    const download = join(__dirname, 'download-terraform');

    execFile(download, async (err) => {
      if (err) { return done(err); }

      try {
        const port = await getPort();
        url = await connect(port);
        process.env.HOSTNAME = url.host;
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
  });

  describe('basic setup', () => {
    before(async () => {
      try {
        await mkdir(targetDir);
      } catch (ignore) {
        // ignored when targetDir already exist
      }

      const definition = terraformDefinition.replace(/__MODULE_ADDRESS__/, `${url.host}/citizen-test/no-vpc/aws`);
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
          expect(data['modules.v1']).to.equal(`${url.href}v1/`);
          done();
        });
      }).on('error', done);
    });

    it('cli should connect the registry server with terraform-cli', (done) => {
      const cwd = join(__dirname, 'fixture');

      execFile(terraform, ['get'], { cwd }, (err, stdout, stderr) => {
        expect(stdout).to.include('- module.vpc');
        expect(stderr).to.include('no versions found');
        done();
      });
    });
  });
});
