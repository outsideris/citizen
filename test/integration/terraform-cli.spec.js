const https = require('https');
const { expect } = require('chai');
const getPort = require('get-port');
const { execFile } = require('child_process');
const { join } = require('path');

const { connect, disconnect } = require('./ngrok');
const registry = require('./registry');

describe('terraform CLI integration', () => {
  let url;
  before((done) => {
    const download = join(__dirname, 'download-terraform');

    execFile(download, async (err) => {
      if (err) { return done(err); }

      const port = await getPort();
      url = await connect(port);
      process.env.HOSTNAME = url.host;
      registry.run(port);
      return done();
    });
  });

  after(async () => {
    await disconnect();
    // TODO: terminate the rigistry server
  });

  it('should connect the registry server', (done) => {
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

  it('should conntet the registry server with terraform-cli', (done) => {
    const terraform = join(__dirname, 'temp', 'terraform');
    const cwd = join(__dirname, 'fixture', 'simple');

    execFile(terraform, ['get'], { cwd }, (err, stdout, stderr) => {
      expect(stdout).to.include('Getting source');
      expect(stderr).to.include('bad response code: 404');
      done();
    });
  });
});
