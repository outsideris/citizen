const path = require('path');
const { expect } = require('chai');

const { makeFileList } = require('../../lib/module');

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
});
