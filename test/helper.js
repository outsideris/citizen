const fs = require('node:fs');
const tmp = require('tmp');
const AdmZip = require('adm-zip');

const { genShaSums, sign } = require('../lib/provider/provider');

const helper = {
  deleteDbAll: async (db) => {
    await db.module.deleteMany({});
    await db.provider.deleteMany({});
  },
  generateProvider: (prefix, platforms) =>
    new Promise((resolve, reject) => {
      tmp.dir({ unsafeCleanup: true }, (err, tempDir, cleanupCallback) => {
        if (err) {
          return reject(err);
        }

        const tfProviderExcutable = `terraform-provider${prefix.substr(prefix.indexOf('-'))}`;
        const content = 'echo provider';
        fs.writeFileSync(tfProviderExcutable, content);
        fs.chmodSync(tfProviderExcutable, 755);

        const zip = new AdmZip();
        zip.addFile(tfProviderExcutable, Buffer.alloc(content.length, content));
        platforms.forEach((p) => {
          zip.writeZip(`${tempDir}/${prefix}_${p}.zip`);
        });

        fs.unlinkSync(tfProviderExcutable);

        return genShaSums(prefix, tempDir)
          .then(async (shaSumsFile) => {
            const sigFile = await sign(shaSumsFile, tempDir);
            return [shaSumsFile, sigFile];
          })
          .then(([shaSumsFile, sigFile]) => resolve([tempDir, cleanupCallback, shaSumsFile, sigFile]))
          .catch((e) => reject(e));
      });
    }),
};

module.exports = helper;
