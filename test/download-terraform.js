const got = require('got');
const { join } = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unzipper = require('unzipper');
const semver = require('semver');
const debug = require('debug');

const { citizen } = require('../package.json');

const chmod = promisify(fs.chmod);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

const TERRAFORM_VERSIONS = citizen.terraformVersions.map((version) => ({
  release: semver.parse(version).minor,
  version,
}));

const PLATFORM = process.platform;
const TARGET_DIR = join(__dirname, 'terraform-binaries');

const download = async (terraform) => {
  const log = debug(`citizen:test:download:terraform-v${terraform.version}`);

  const terraformFile = join(TARGET_DIR, `terraform${terraform.release}`);
  let notExist = false;
  try {
    await access(terraformFile);
  } catch (ignore) {
    notExist = true;
  }

  const DOWNLOAD_URL = `https://releases.hashicorp.com/terraform/${terraform.version}/terraform_${terraform.version}_${PLATFORM}_amd64.zip`;

  return new Promise((resolve, reject) => {
    if (notExist) {
      log('Start to download terraform');
      return got.stream(DOWNLOAD_URL)
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          log('download completed');

          const fileName = entry.path;
          if (fileName === 'terraform') {
            log('Write it as a file');
            entry.on('finish', async () => {
              await chmod(`${TARGET_DIR}/${fileName}${terraform.release}`, 0o765);
              log('All done.');
              resolve(terraform.release);
            });
            entry.pipe(fs.createWriteStream(`${TARGET_DIR}/${fileName}${terraform.release}`));
          } else {
            entry.autodrain();
            reject(new Error(`Wrong terraform file for ${terraform.version}`));
          }
        });
    }

    log('skip to download terraform');
    return resolve(terraform.release);
  });
};

exports.mochaHooks = {
  beforeAll: async () => {
    try {
      await mkdir(TARGET_DIR);
    } catch (ignore) {
      // ignored when targetDir already exist
    }

    await Promise.all(TERRAFORM_VERSIONS.map(download));
  },
};
