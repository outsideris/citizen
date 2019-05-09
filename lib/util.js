const { readFile } = require('fs');
const { basename, extname, join } = require('path');
const { promisify } = require('util');
const hcl = require('gopher-hcl');
const tar = require('tar');
const { Duplex } = require('stream');
const { URLSearchParams } = require('url');
const recursive = require('recursive-readdir');
const _ = require('lodash');
const tmp = require('tmp');

const readFileProm = promisify(readFile);

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
    ? Object.keys(module.variable).map(name => ({ name, ...module.variable[name] }))
    : [],
  outputs: module.output
    ? Object.keys(module.output).map(name => ({ name, ...module.output[name] }))
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

  tmp.dir({ unsafeCleanup: true }, (err, tempDir, cleanupCallback) => {
    if (err) { return reject(err); }

    return stream.pipe(tar.x({ cwd: tempDir }))
      .on('finish', async () => {
        try {
          const files = await recursive(tempDir, [ignore]);

          // make a root module definition
          const rootData = await extractDefinition(files, tempDir);
          rootData.name = moduleName;
          const rootDefinition = nomarlizeModule(rootData);

          // make submodules definition
          const submodulesData = await extractSubmodules(rootData, files, tempDir);
          const submodulesDefinition = submodulesData.map(s => nomarlizeModule(s));
          submodulesDefinition.forEach((s) => {
            let modulePath = files.find(f => f.includes(`/${s.name}/`));
            if (modulePath.includes(`${tempDir}/`)) { modulePath = modulePath.replace(`${tempDir}/`, ''); };
            modulePath = modulePath.substr(0, modulePath.lastIndexOf('/'));
            s.path = modulePath; // eslint-disable-line no-param-reassign
          });

          resolve({
            root: rootDefinition,
            submodules: submodulesDefinition,
          });
        } catch (e) {
          reject(e);
        } finally {
          cleanupCallback();
        }
      });
  });
});

module.exports = {
  makeUrl,
  parseHcl,
};
