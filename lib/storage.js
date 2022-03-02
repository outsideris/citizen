/* eslint-disable global-require */
let storage;

if (process.env.CITIZEN_STORAGE === 's3') {
  storage = await import('../storages/s3.js')
} else {
  storage = await import('../storages/file.js')
}

const { type, saveModule, hasModule, getModule, saveProvider, hasProvider, getProvider } = storage.default;

export {
  type,
  saveModule,
  hasModule,
  getModule,
  saveProvider,
  hasProvider,
  getProvider,
}
