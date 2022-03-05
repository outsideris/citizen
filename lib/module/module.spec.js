/* eslint-disable no-unused-expressions */
import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import { promisify } from 'util';
import http from 'http';
import { fileURLToPath } from 'url';

import app from '../../app.js';
import tfModule from './module.js';

const readFile = promisify(fs.readFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('module cli', () => {
  describe('publish()', () => {
    let server;
    const port = 20000;
    const registry = `http://127.0.0.1:${port}`;
    const modulePath = `hashicorp/consul/aws/${(new Date()).getTime()}`;

    before((done) => {
      server = http.createServer(app);
      server.listen(port);
      server.on('listening', done);
    });

    after(() => {
      server.close();
    });

    it('should upload the tarball into registry', async () => {
      const tarballPath = path.join(__dirname, '..', '..', 'test', 'fixture', 'module.tar.gz');
      const moduleBuf = await readFile(tarballPath);
      const res = await tfModule.publish(registry, modulePath, moduleBuf);
      const body = JSON.parse(res.body);
      expect(body.modules[0].id).to.equal(modulePath);
    });
  });
});
