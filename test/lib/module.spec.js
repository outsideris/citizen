const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { Writable } = require('stream');
const tar = require('tar');
const recursive = require('recursive-readdir');
const rimraf = require('rimraf');

const { makeFileList, makeTarball } = require('../../lib/module');

describe('module\'s', () => {
  describe('makeFileList()', () => {
    it('should make file list', async () => {
      const target = path.join(__dirname, '../fixture/module1');
      const result = await makeFileList(target);
      expect(result).to.have.members(['b.js', 'c', 'c/d.js', 'c/e.js', 'README.md', 'a.js']);
    });

    it('should ignore files depends on .gitignore', async () => {
      const target = path.join(__dirname, '../fixture/module2');
      const result = await makeFileList(target);
      expect(result).to.have.members(['b.js', 'a.js', 'c']);
    });
  });

  describe('makeTarball()', () => {
    it('should compress module files to an writable stream', (done) => {
      const writer = new Writable({
        write(chunk, encoding, callback) {
          callback();
        },
      });
      writer.on('finish', done);

      const target = path.join(__dirname, '../fixture/module1');
      const files = ['a.js', 'b.js', 'c', 'c/d.js', 'c/e.js', 'README.md'];
      const result = makeTarball(target, files, writer);

      expect(result).to.be.an.instanceof(Writable);
    });

    it('should make module filses as tarball', (done) => {
      const UNTAR_DIR = 'test/untar';
      fs.mkdirSync(UNTAR_DIR);

      const target = path.join(__dirname, '../fixture/module1');
      const files = ['a.js', 'b.js', 'c', 'c/d.js', 'c/e.js', 'README.md'];
      const result = makeTarball(target, files, tar.x({
        cwd: UNTAR_DIR,
      }));

      result.on('finish', () => {
        recursive(UNTAR_DIR, (err, list) => {
          expect(list).to.have.members([
            `${UNTAR_DIR}/a.js`,
            `${UNTAR_DIR}/b.js`,
            `${UNTAR_DIR}/c/d.js`,
            `${UNTAR_DIR}/c/e.js`,
            `${UNTAR_DIR}/README.md`,
          ]);
          rimraf(UNTAR_DIR, done);
        });
      });
    });

    it('should make module filses with .gitignore as tarball', (done) => {
      const UNTAR_DIR = 'test/untar';
      fs.mkdirSync(UNTAR_DIR);

      const target = path.join(__dirname, '../fixture/module2');
      const files = ['a.js', 'b.js'];
      const result = makeTarball(target, files, tar.x({
        cwd: UNTAR_DIR,
      }));

      result.on('finish', () => {
        recursive(UNTAR_DIR, (err, list) => {
          expect(list).to.have.members([
            `${UNTAR_DIR}/a.js`,
            `${UNTAR_DIR}/b.js`,
          ]);
          rimraf(UNTAR_DIR, done);
        });
      });
    });
  });
});
