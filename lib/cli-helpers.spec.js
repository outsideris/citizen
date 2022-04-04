/* eslint-disable no-unused-expressions */
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { Duplex } = require('stream');
const tar = require('tar');
const recursive = require('recursive-readdir');
const rimraf = require('rimraf');

const {
  isValidNamespace,
  isValidName,
  isValidVersion,
  isValidProtocol,
  makeFileList,
  makeTarball,
} = require('./cli-helpers');

describe('cli-helpers', () => {
  describe('isValidNamespace()', () => {
    it('should check namespace consists of alphanumeric characters ', () => {
      const result = isValidNamespace('1a2b3c');
      expect(result).to.be.true;
    });

    it('should check namespace consists of alphanumeric characters or single hyphens', () => {
      const result = isValidNamespace('abc-123');
      expect(result).to.be.true;
    });

    it('should check namespace which begins with a hyphen', () => {
      const result = isValidNamespace('-abc123');
      expect(result).to.be.false;
    });

    it('should check namespace which ends with a hyphen', () => {
      const result = isValidNamespace('abc123-');
      expect(result).to.be.false;
    });
  });

  describe('isValidName()', () => {
    it('should check name consists of alphanumeric characters or single hyphens', () => {
      const result = isValidName('citizen-test1');
      expect(result).to.be.true;
    });

    it('should check module name which doesn\'t formatted in terraform-PROVIDER-NAME', () => {
      const result = isValidName('terraform-aws-');
      expect(result).to.be.false;
    });

    it('should check module name which contain special characters', () => {
      const result = isValidName('terraform-aws-cons$ul');
      expect(result).to.be.false;
    });
  });

  describe('isValidVersion()', () => {
    it('should check semver format', () => {
      const result = isValidVersion('0.1.0');
      expect(result).to.be.equal('0.1.0');
    });

    it('should check semver format with v prefix', () => {
      const result = isValidVersion('v0.1.0');
      expect(result).to.be.equal('0.1.0');
    });

    it('should check no semver format', () => {
      const result = isValidVersion('0.1');
      expect(result).to.be.null;
    });
  });

  describe('isValidProtocol()', () => {
    it('should check protocol format', () => {
      const result = isValidProtocol('5.1');
      expect(result).to.be.true;
    });

    it('should be false with protocol format', () => {
      const result = isValidProtocol('5.1.0');
      expect(result).to.be.false;
    });

    it('should check be false with only major version', () => {
      const result = isValidProtocol('4');
      expect(result).to.be.false;
    });

    it('should check be false with non-numeric', () => {
      const result = isValidProtocol('1.a');
      expect(result).to.be.false;
    });
  });

  describe('makeFileList()', () => {
    it('should make file list', async () => {
      const target = path.join(__dirname, './fixture/module1');
      const result = await makeFileList(target);
      expect(result).to.have.members(['b.js', 'c/d.js', 'c/e.js', 'README.md', 'a.js']);
    });

    it('should ignore files depends on .gitignore', async () => {
      const target = path.join(__dirname, './fixture/module2');
      const result = await makeFileList(target);
      expect(result).to.have.members(['b.js', 'a.js']);
    });
  });

  describe('makeTarball()', () => {
    const UNTAR_DIR = 'test-untar';

    beforeEach((done) => {
      fs.mkdir(UNTAR_DIR, done);
    });

    afterEach((done) => {
      rimraf(UNTAR_DIR, done);
    });

    it('should return compressed module file as Buffer', async () => {
      const target = path.join(__dirname, './fixture/module1');
      const files = ['a.js', 'b.js', 'c', 'c/d.js', 'c/e.js', 'README.md'];
      const result = await makeTarball(target, files);
      expect(result).to.be.an.instanceof(Buffer);
    });

    it('should make module files as tarball', (done) => {
      const target = path.join(__dirname, './fixture/module1');
      const files = ['a.js', 'b.js', 'c', 'c/d.js', 'c/e.js', 'README.md'];

      makeTarball(target, files)
        .then((compressed) => {
          const tarball = new Duplex();
          tarball.push(compressed);
          tarball.push(null);

          tarball.pipe(tar.x({ cwd: UNTAR_DIR }))
            .on('finish', () => {
              recursive(UNTAR_DIR, (err, list) => {
                expect(list).to.have.members([
                  `${UNTAR_DIR}/a.js`,
                  `${UNTAR_DIR}/b.js`,
                  `${UNTAR_DIR}/c/d.js`,
                  `${UNTAR_DIR}/c/e.js`,
                  `${UNTAR_DIR}/README.md`,
                ]);
                done();
              });
            });
        });
    });

    it('should make module filses with .gitignore as tarball', (done) => {
      const target = path.join(__dirname, './fixture/module2');
      const files = ['a.js', 'b.js'];

      makeTarball(target, files)
        .then((compressed) => {
          const tarball = new Duplex();
          tarball.push(compressed);
          tarball.push(null);

          tarball.pipe(tar.x({ cwd: UNTAR_DIR }))
            .on('finish', () => {
              recursive(UNTAR_DIR, (err, list) => {
                expect(list).to.have.members([
                  `${UNTAR_DIR}/a.js`,
                  `${UNTAR_DIR}/b.js`,
                ]);
                done();
              });
            });
        });
    });
  });
});
