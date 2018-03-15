const { mkdir, readFile } = require('fs');
const { basename, extname, join } = require('path');
const { promisify } = require('util');
const hcl = require('gopher-hcl');
const tar = require('tar');
const uuid = require('uuid/v1');
const { Duplex } = require('stream');
const { URLSearchParams } = require('url');
const recursive = require('recursive-readdir');
const rimraf = require('rimraf');
const _ = require('lodash');

const readFileProm = promisify(readFile);
const rmdir = promisify(rimraf);

const makeUrl = (req, search) => {
  const params = new URLSearchParams(search);
  const searchStr = params.toString() ? `?${params.toString()}` : '';

  // eslint-disable-next-line no-underscore-dangle
  return `${req.baseUrl}${req._parsedUrl.pathname}${searchStr}`;
};

const ignore = (file, stats) => {
  if ((stats.isDirectory() || extname(file) === '.tf') && !basename(file).startsWith('._')) {
    return false;
  }
  return true;
};

const hclToJson = async (filePath) => {
  const content = await readFileProm(filePath);
  const json = hcl.parse(content.toString());

  return json;
};

const extractDefinition = async(files, targetPath) => {
  const tfFiles = files.filter((f) => {
    const relativePath = f.replace(targetPath, '');
    if (relativePath.lastIndexOf('/') > 0) {
      return false;
    }
    return true;
  });

  const promises = tfFiles.map(async (r) => await hclToJson(r));
  const list = await Promise.all(promises);

  return _.reduce(list, (l, accum) => _.merge(accum, l), {});
};

const nomarlizeModule = module => ({
  path: "",
  name: module.name || '',
  readme: '',
  empty: !module,
  inputs: module.variable
    ? Object.keys(module.variable).map((name) => ({ name, ...module.variable[name] }))
    : [],
  outputs: module.output
    ? Object.keys(module.output).map(name => ({ name, ...module.output[name] }))
    : [],
  dependencies: [],
  resources: [],
});

const parseHcl = (moduleName, compressedModule) => {
  return new Promise((resolve, reject) => {
    const stream = new Duplex();
    stream.push(compressedModule);
    stream.push(null);

    const UNTAR_DIR = join(__dirname, uuid());
    mkdir(UNTAR_DIR, (err) => {
      if (err) { return reject(err); }

      stream.pipe(tar.x({ cwd: UNTAR_DIR }))
        .on('finish', async () => {
          try {
            const files = await recursive(UNTAR_DIR, [ignore]);

            // make a root module definition
            const rootData = await extractDefinition(files, UNTAR_DIR);
            rootData.name = moduleName;
            const rootDefinition = nomarlizeModule(rootData);

            await rmdir(UNTAR_DIR);
            resolve();
          } catch (e) {
            await rmdir(UNTAR_DIR);
            reject(e);
          }
        });
    });
  });
};

module.exports = {
  makeUrl,
  parseHcl,
};
