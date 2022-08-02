const { PrismaClient } = require('@prisma/client');
const debug = require('debug')('citizen:server:store:sqlite');

const storeType = 'sqlite';
const prisma = new PrismaClient();

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
  debug('search store with %o', options);

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
};
