const https = require('https');
const { expect } = require('chai');
const getPort = require('get-port');

const { connect, disconnect } = require('./ngrok');
const registry = require('./registry');

describe('terraform CLI integration', () => {
  let url;
  before(async () => {
    const port = await getPort();
    url = await connect(port);
    process.env.HOSTNAME = url.host;
    registry.run(port);
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
});
