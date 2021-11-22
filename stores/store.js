/* eslint-disable global-require */
const debug = require('debug')('citizen:server:store');

let store;

const init = (dbType) => {
  const t = dbType || process.env.CITIZEN_DATABASE;
  if (t === 'mongodb') {
    store = require('./mongodb');
  } else {
    store = require('./nedb');
  }
};

const getStoreType = () => store.storeType;

// modules
const moduleDb = () => store.moduleDb;

const saveModule = async (data) => {
  const {
    namespace,
    name,
    provider,
    version,
    owner,
    location,
    definition = {},
  } = data;

  const module = {
    owner: owner || '',
    namespace,
    name,
    provider,
    version,
    location,
    ...definition,
  };

  const m = await store.saveModule(module);
  debug('saved the module into store: %o', module);
  return m;
};

const findAllModules = async ({
  selector = {},
  namespace = '',
  provider = '',
  offset = 0,
  limit = 15,
} = {}) => {
  const options = selector;

  if (namespace) {
    options.namespace = namespace;
  }
  if (provider) {
    options.provider = provider;
  }
  debug('search store with %o', options);

  const modules = await store.findModules(options);
  const totalRows = modules.length;
  const meta = {
    limit: +limit,
    currentOffset: +offset,
    nextOffset: +offset + +limit,
    prevOffset: +offset - +limit,
  };
  if (meta.prevOffset < 0) { meta.prevOffset = null; }
  if (meta.nextOffset >= totalRows) { meta.nextOffset = null; }

  const result = await store.findAllModules(options, meta, +offset, +limit);
  return result;
};

const getModuleVersions = async ({ namespace, name, provider } = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }

  const options = {
    namespace,
    name,
    provider,
  };

  debug('search versions in store with %o', options);
  const docs = await store.getModuleVersions(options);

  const result = docs.map((d) => ({
    version: d.version,
    submodules: d.submodules,
    root: d.root,
  }));
  debug('search versions result from store: %o', docs);
  return result;
};

const getModuleLatestVersion = async ({ namespace, name, provider } = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }

  const options = {
    namespace,
    name,
    provider,
  };

  const result = await store.getModuleLatestVersion(options);
  return result;
};

const findOneModule = async ({
  namespace,
  name,
  provider,
  version,
} = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }
  if (!version) { throw new Error('version required.'); }

  const options = {
    namespace,
    name,
    provider,
    version,
  };

  debug('search a module in store with %o', options);
  const result = await store.findOneModule(options);
  return result;
};

const increaseModuleDownload = async ({
  namespace,
  name,
  provider,
  version,
} = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!name) { throw new Error('name required.'); }
  if (!provider) { throw new Error('provider required.'); }
  if (!version) { throw new Error('version required.'); }

  const options = {
    namespace,
    name,
    provider,
    version,
  };

  const result = await store.increaseModuleDownload(options);
  return result;
};

// providers
const providerDb = () => store.providerDb;

const saveProvider = async (data) => {
  const p = {
    namespace: data.namespace,
    type: data.type,
    version: data.version,
    protocols: data.protocols,
    platforms: [],
    gpgPublicKeys: [],
  };

  if (data.platforms && data.platforms.length > 0) {
    data.platforms.forEach((platform) => {
      p.platforms.push({
        os: platform.os,
        arch: platform.arch,
        filename: platform.filename,
        shasum: platform.shasum,
      });
    });
  }

  if (data.gpgPublicKeys && data.gpgPublicKeys.length > 0) {
    data.gpgPublicKeys.forEach((key) => {
      p.gpgPublicKeys.push({
        keyId: key.keyId,
        asciiArmor: key.asciiArmor,
        trustSignature: key.trustSignature,
        source: key.source,
        sourceUrl: key.sourceUrl,
      });
    });
  }

  const result = await store.saveProvider(p);
  return result;
};

const findOneProvider = async ({
  namespace,
  type,
  version,
} = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!type) { throw new Error('type required.'); }
  if (!version) { throw new Error('version required.'); }

  const options = {
    namespace,
    type,
    version,
  };

  debug('search a provider in store with %o', options);
  const result = await store.findOneProvider(options);
  return result;
};

const increaseProviderDownload = async ({
  namespace,
  type,
  version,
} = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!type) { throw new Error('type required.'); }
  if (!version) { throw new Error('version required.'); }

  const options = {
    namespace,
    type,
    version,
  };
  debug('increase provider download count with %o', options);
  const result = await store.increaseProviderDownload(options);
  return result;
};

const findAllProviders = async ({
  selector = {},
  namespace = '',
  type = '',
  offset = 0,
  limit = 15,
} = {}) => {
  const options = selector;

  if (namespace) {
    options.namespace = namespace;
  }
  if (type) {
    options.type = type;
  }
  debug('search store with %o', options);

  const providers = await store.findProviders(options);
  const totalRows = providers.length;
  const meta = {
    limit: +limit,
    currentOffset: +offset,
    nextOffset: +offset + +limit,
    prevOffset: +offset - +limit,
  };
  if (meta.prevOffset < 0) { meta.prevOffset = null; }
  if (meta.nextOffset >= totalRows) { meta.nextOffset = null; }

  const result = await store.findAllProviders(options, meta, +offset, +limit);
  return result;
};

const getProviderVersions = async ({ namespace, type } = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!type) { throw new Error('type required.'); }

  const options = {
    namespace,
    type,
  };

  debug('search versions in store with %o', options);
  const docs = await store.getProviderVersions(options);

  if (docs.length > 0) {
    const result = {
      id: `${docs[0].namespace}/${docs[0].type}`,
      versions: [],
    };

    result.versions = docs.map((d) => ({
      version: d.version,
      protocols: d.protocols,
      platforms: d.platforms.map((p) => ({
        os: p.os,
        arch: p.arch,
      })),
      downloads: d.downloads,
      last_downloaded_at: d.last_downloaded_at,
    }));
    debug('search provider versions result from store: %o', result);

    return result;
  }

  return null;
};

// FIXME: return correct response format
const findProviderPackage = async ({
  namespace = '',
  type = '',
  version = '',
  os = '',
  arch = '',
} = {}) => {
  if (!namespace) { throw new Error('namespace required.'); }
  if (!type) { throw new Error('type required.'); }
  if (!version) { throw new Error('version required.'); }
  if (!os) { throw new Error('os required.'); }
  if (!arch) { throw new Error('arch required.'); }

  const options = {
    namespace,
    type,
    version,
    'platforms.os': os,
    'platforms.arch': arch,
  };

  debug('search a provider store with %o', options);
  const result = await store.findProviderPackage(options);
  return result;
};

init();

module.exports = {
  init,
  getStoreType,
  moduleDb,
  saveModule,
  findAllModules,
  getModuleVersions,
  getModuleLatestVersion,
  findOneModule,
  increaseModuleDownload,
  providerDb,
  saveProvider,
  findOneProvider,
  increaseProviderDownload,
  findAllProviders,
  getProviderVersions,
  findProviderPackage,
};
