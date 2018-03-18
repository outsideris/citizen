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

const extractDefinition = async (files, targetPath) => {
  const tfFiles = files.filter((f) => {
    const relativePath = f.replace(targetPath, '');
    if (relativePath.lastIndexOf('/') > 0) {
      return false;
    }
    return true;
  });

  const promises = tfFiles.map(async (r) => {
    const j = await hclToJson(r);
    return j;
  });
  const list = await Promise.all(promises);

  return _.reduce(list, (l, accum) => _.merge(accum, l), {});
};

const nomarlizeModule = module => ({
  path: '',
  name: module.name || '',
  readme: '',
  empty: !module,
  inputs: module.variable
    ? Object.keys(module.variable).map(name => Object.assign({ name }, module.variable[name]))
    : [],
  outputs: module.output
    ? Object.keys(module.output).map(name => Object.assign({ name }, module.output[name]))
    : [],
  dependencies: [],
  resources: module.resource
    ? Object.keys(module.resource).map(type => ({ name: Object.keys(module.resource)[0], type }))
    : [],
});

const extractSubmodules = async (definition, files, targetPath) => {
  let pathes = [];
  if (definition.module) {
    const submodules = Object.keys(definition.module).map(key => definition.module[key].source);
    pathes = _.uniq(submodules);
  }

  const promises = pathes.map(async (p) => {
    const data = await extractDefinition(files, join(targetPath, p));
    data.name = p.substr(p.lastIndexOf('/') + 1);

    let result = [data];
    if (data.module) {
      const m = await extractSubmodules(data, files, join(targetPath, p));
      result = result.concat(m);
    }
    return result;
  });

  const submodules = _.flatten(await Promise.all(promises));
  return submodules;
};

const parseHcl = (moduleName, compressedModule) => new Promise((resolve, reject) => {
  const stream = new Duplex();
  stream.push(compressedModule);
  stream.push(null);

  const UNTAR_DIR = join(__dirname, uuid());
  mkdir(UNTAR_DIR, (err) => {
    if (err) { return reject(err); }

    return stream.pipe(tar.x({ cwd: UNTAR_DIR }))
      .on('finish', async () => {
        try {
          const files = await recursive(UNTAR_DIR, [ignore]);

          // make a root module definition
          const rootData = await extractDefinition(files, UNTAR_DIR);
          rootData.name = moduleName;
          const rootDefinition = nomarlizeModule(rootData);

          // make submodules definition
          const submodulesData = await extractSubmodules(rootData, files, UNTAR_DIR);
          const submodulesDefinition = submodulesData.map(s => nomarlizeModule(s));
          submodulesDefinition.forEach((s) => {
            let modulePath = files.find(f => f.includes(`/${s.name}/`));
            modulePath = modulePath.replace(`${UNTAR_DIR}/`, '');
            modulePath = modulePath.substr(0, modulePath.lastIndexOf('/'));
            s.path = modulePath; // eslint-disable-line no-param-reassign
          });

          await rmdir(UNTAR_DIR);
          resolve({
            root: rootDefinition,
            submodules: submodulesDefinition,
          });
        } catch (e) {
          await rmdir(UNTAR_DIR);
          reject(e);
        }
      });
  });
});

module.exports = {
  makeUrl,
  parseHcl,
};
