const { PrismaClient } = require('@prisma/client/mongodb');
const debug = require('debug')('citizen:server:store:mongodb');

const storeType = 'mongodb';

const config = {};
if (process.env.VERBOSE_DB_LOG) {
  config.log = ['query', 'info', 'warn', 'error'];
}
const prisma = new PrismaClient(config);

// modules
const saveModule = async (data) => {
  const result = await prisma.module.create({ data });
  debug('saved the module into store: %o', result);
  return result;
};

const findModules = async (options) => {
  const modules = await prisma.module.findMany({ where: options });
  return modules;
};

const findAllModules = async (options, meta, offset, limit) => {
  debug('search all modules with %o', options);

  const modules = await prisma.module.findMany({
    where: options,
    skip: offset,
    take: limit,
    orderBy: [{ published_at: 'asc' }, { version: 'asc' }],
  });
  debug('search result from store: %o', modules);

  return { meta, modules };
};

const getModuleVersions = async (options) => {
  debug('search module versions in store with %o', options);
  const modules = await prisma.module.findMany({ where: options, orderBy: { id: 'asc' } });
  return modules;
};

const getModuleLatestVersion = async (options) => {
  const module = await prisma.module.findFirst({ where: options, orderBy: { version: 'desc' } });
  debug('search latest version result from store: %o', module);
  return module;
};

const findOneModule = async (options) => {
  debug('search a module in store with %o', options);
  const module = await prisma.module.findFirst({ where: options });
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
    return module;
  }
  return null;
};

// providers
const saveProvider = async (data) => {
  const result = await prisma.provider.create({ data });
  debug('saved the provider into db: %o', result);

  return result;
};

const findOneProvider = async (options) => {
  const provider = await prisma.provider.findFirst({ where: options });
  debug('search a provider in store with %o', options);
  return provider;
};

const findProviders = async (options) => {
  const providers = await prisma.provider.findMany({ where: options });
  return providers;
};

const findAllProviders = async (options, meta, offset, limit) => {
  debug('search all providers with %o', options);

  const providers = await prisma.provider.findMany({
    where: options,
    skip: offset,
    take: limit,
    orderBy: [{ published_at: 'asc' }, { version: 'asc' }],
  });
  debug('search result from store: %o', providers);

  return { meta, providers };
};

const getProviderVersions = async (options) => {
  debug('search provider versions in store with %o', options);
  const providers = await prisma.provider.findMany({ where: options, orderBy: { id: 'asc' } });
  return providers;
};

const findProviderPackage = async (options) => {
  const {
    namespace, type, version, 'platforms.os': os, 'platforms.arch': arch,
  } = options;
  const providers = await prisma.provider.findMany({
    where: {
      namespace,
      type,
      version,
    },
    orderBy: { version: 'desc' },
  });
  const packages = providers
    .filter((p) => p.platforms.some((i) => i.os === os && i.arch === arch));
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
