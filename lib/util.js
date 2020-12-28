const { readFile } = require('fs');
const { basename, extname, join } = require('path');
const { promisify } = require('util');
const tar = require('tar');
const { Duplex } = require('stream');
const { URLSearchParams } = require('url');
const recursive = require('recursive-readdir');
const _ = require('lodash');
const tmp = require('tmp');
const debug = require('debug')('citizen:server');
const util = require('util');

const hcl = require('@evops/hcl-terraform-parser');

const readFileProm = promisify(readFile);

const makeUrl = (req, search) => {
  const params = new URLSearchParams(search);
  const searchStr = params.toString() ? `?${params.toString()}` : '';

  // eslint-disable-next-line no-underscore-dangle
  return `${req.baseUrl}${req._parsedUrl.pathname}${searchStr}`;
};

const ignore = (file, stats) => {
  if (stats.isDirectory()) {
    return false;
  }

  if (extname(file) === '.tf') {
    return false;
  }

  if (!basename(file).startsWith('._')) {
    return false;
  }

  return true;
};

const hclToJson = async (filePath) => {
  const content = await readFileProm(filePath);
  return hcl.parse(content.toString(), filePath);
};

const extractDefinition = async (files, targetPath) => {
  const tfFiles = files.filter((f) => {
    // Need to constraint lookup to files within target path
    // otherwise we are exposing ourselves to FS based security
    // attacks
    if (f.indexOf(targetPath) !== 0) {
      return false;
    }

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

// As module information is stored directly
// in the database, we need to normalise the
// object keys to ensure no invalid characters
// in the names e.g. full stop (.)
const normalizeKeyNamesForDbStorage = (obj) => {
  if (!obj) {
    return obj;
  }

  const result = {};
  Object.keys(obj).forEach((key) => {
    const newKey = key.replace(/[^\w\d_]/g, '__');
    result[newKey] = obj[key];
  });
  return result;
};

const nomarlizeModule = (module) => ({
  path: '',
  name: module.name || '',
  readme: '',
  empty: !module,
  inputs: normalizeKeyNamesForDbStorage(module.inputs),
  outputs: normalizeKeyNamesForDbStorage(module.outputs),
  dependencies: [],
  module_calls: normalizeKeyNamesForDbStorage(module.module_calls),
  resources: normalizeKeyNamesForDbStorage(module.managed_resources),
});

const extractSubmodules = async (definition, files, targetPath) => {
  let submodulePaths = [];
  if (definition.module_calls) {
    const submodules = Object.keys(definition.module_calls)
      .map((k) => definition.module_calls[k].source);

    submodulePaths = _.uniq(submodules);
  }

  const promises = submodulePaths.map(async (p) => {
    const data = await extractDefinition(files, join(targetPath, p));
    // Submodule was not found in the archive, ignore
    if (Object.keys(data).length === 0) {
      return [];
    }
    data.name = p.substr(p.lastIndexOf('/') + 1);

    let result = [data];
    if (data.module_calls) {
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

          debug('Files found in the archive: %s', files);

          // make a root module definition
          const rootData = await extractDefinition(files, tempDir);
          rootData.name = moduleName;
          const rootDefinition = nomarlizeModule(rootData);

          debug('Module definition: %s', util.inspect(rootDefinition, false, 15));

          // make submodules definition
          const submodulesData = await extractSubmodules(rootData, files, tempDir);
          const submodulesDefinition = submodulesData.map((s) => nomarlizeModule(s));
          submodulesDefinition.forEach((s) => {
            let modulePath = files.find((f) => f.includes(`/${s.name}/`));
            modulePath = modulePath.replace(`${tempDir}/`, '');
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
