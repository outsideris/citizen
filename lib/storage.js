/* eslint-disable global-require */
let type;
let saveModule;
let hasModule;
let getModule;
let saveProvider;
let hasProvider;
let getProvider;

if (process.env.CITIZEN_STORAGE === 's3') {
  import('../storages/s3.js')
    .then(module => {
      ({
        type, saveModule, hasModule, getModule,
          saveProvider, hasProvider, getProvider
      } = module);
    });
} else {
  import('../storages/file.js')
    .then(module => {
      ({
        type, saveModule, hasModule, getModule,
        saveProvider, hasProvider, getProvider
      } = module);
    });
}

export {
  type,
  saveModule,
  hasModule,
  getModule,
  saveProvider,
  hasProvider,
  getProvider,
}
