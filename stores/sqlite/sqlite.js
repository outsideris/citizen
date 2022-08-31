const { PrismaClient } = require('@prisma/client/sqlite');
const debug = require('debug')('citizen:server:store:sqlite');

const { normalizeSqlitePath } = require('../../lib/util');

const storeType = 'sqlite';

normalizeSqlitePath();

const config = {};
if (process.env.VERBOSE_DB_LOG) {
  config.log = ['query', 'info', 'warn', 'error'];
}
const prisma = new PrismaClient(config);

// modules
const delimiter = '#$$#';
const serializeObjectArray = (arr) => {
  const temp = arr.map((a) => JSON.stringify(a));
  return temp.join(delimiter);
};

const deserializeString = (str) => str.split(delimiter).map((s) => JSON.parse(s));

const serializeModule = (m) => {
  const module = m;
  if (module.root) {
    module.root = JSON.stringify(module.root);
  }
  if (module.submodules) {
    module.submodules = serializeObjectArray(module.submodules);
  }
  return module;
};

const deserializeModule = (m) => {
  if (!m) {
    return null;
  }
  const module = m;
  module.root = module.root ? JSON.parse(module.root) : null;
  module.submodules = module.submodules ? deserializeString(module.submodules) : [];
  return module;
};

const saveModule = async (data) => {
  const module = serializeModule(data);
  const result = await prisma.module.create({ data: module });
  const resultModule = deserializeModule(result);
  debug('saved the module into store: %o', resultModule);
  return resultModule;
};

const findModules = async (options) => {
  const modules = await prisma.module.findMany({ where: options });
  return modules.map((m) => deserializeModule(m));
};

const findAllModules = async (options, meta, offset, limit) => {
  debug('search all modules with %o', options);

  const result = await prisma.module.findMany({
    where: options,
    skip: offset,
    take: limit,
    orderBy: [{ published_at: 'asc' }, { version: 'asc' }],
  });
  const modules = result.map((m) => deserializeModule(m));
  debug('search result from store: %o', modules);

  return { meta, modules };
};

const getModuleVersions = async (options) => {
  debug('search module versions in store with %o', options);
  const modules = await prisma.module.findMany({ where: options, orderBy: { id: 'asc' } });
  return modules.map((m) => deserializeModule(m));
};

const getModuleLatestVersion = async (options) => {
  const module = await prisma.module.findFirst({ where: options, orderBy: { version: 'desc' } });
  debug('search latest version result from store: %o', module);
  return deserializeModule(module);
};

const findOneModule = async (options) => {
  debug('search a module in store with %o', options);
  const result = await prisma.module.findFirst({ where: options });
  const module = deserializeModule(result);
  debug('search a module result from store: %o', module);
  return module;
};

const increaseModuleDownload = async (options) => {
  const { count } = await prisma.module.updateMany({
    where: options,
    data: { downloads: { increment: 1 } },
  });
  if (count === 1) {
    const module = await prisma.module.findFirst({ where: options });
    return deserializeModule(module);
  }
  return null;
};

// providers
const serializeProvider = (p) => {
  const provider = p;
  if (!provider.protocols) {
    provider.protocols = [];
  }
  provider.protocols = provider.protocols.toString();
  provider.platforms = serializeObjectArray(provider.platforms);
  provider.gpgPublicKeys = serializeObjectArray(provider.gpgPublicKeys);
  return provider;
};

const deserializeProvider = (p) => {
  if (!p) {
    return null;
  }
  const provider = p;
  provider.protocols = provider.protocols ? provider.protocols.split(',') : [];
  provider.platforms = provider.platforms ? deserializeString(provider.platforms) : [];
  provider.gpgPublicKeys = provider.gpgPublicKeys ? deserializeString(provider.gpgPublicKeys) : [];
  return provider;
};

const saveProvider = async (data) => {
  const provider = serializeProvider(data);

  const result = await prisma.provider.create({ data: provider });
  const resultProvider = deserializeProvider(result);
  debug('saved the provider into db: %o', resultProvider);

  return resultProvider;
};

const findOneProvider = async (options) => {
  const provider = await prisma.provider.findFirst({ where: options });
  debug('search a provider in store with %o', options);
  return deserializeProvider(provider);
};

const findProviders = async (options) => {
  const providers = await prisma.provider.findMany({ where: options });
  return providers.map((p) => deserializeProvider(p));
};

const findAllProviders = async (options, meta, offset, limit) => {
  debug('search all providers with %o', options);

  const result = await prisma.provider.findMany({
    where: options,
    skip: offset,
    take: limit,
    orderBy: [{ published_at: 'asc' }, { version: 'asc' }],
  });
  const providers = result.map((p) => deserializeProvider(p));
  debug('search result from store: %o', providers);

  return { meta, providers };
};

const getProviderVersions = async (options) => {
  debug('search provider versions in store with %o', options);
  const result = await prisma.provider.findMany({ where: options, orderBy: { id: 'asc' } });
  return result.map((p) => deserializeProvider(p));
};

const findProviderPackage = async (options) => {
  const { namespace, type, version, 'platforms.os': os, 'platforms.arch': arch } = options;
  const result = await prisma.provider.findMany({
    where: {
      namespace,
      type,
      version,
    },
    orderBy: { version: 'desc' },
  });
  const providers = result.map((p) => deserializeProvider(p));
  const packages = providers.filter((p) => p.platforms.some((i) => i.os === os && i.arch === arch));
  return packages.length > 0 ? packages[0] : null;
};

module.exports = {
  storeType,
  client: prisma,
  saveModule,
  findModules,
  findAllModules,
  getModuleVersions,
  getModuleLatestVersion,
  findOneModule,
  increaseModuleDownload,
  saveProvider,
  findOneProvider,
  findProviders,
  findAllProviders,
  getProviderVersions,
  findProviderPackage,
};
