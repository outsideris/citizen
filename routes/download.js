const { Router } = require('express');

const { findOneModule, getModuleLatestVersion, increaseModuleDownload } = require('../stores/store');
const { getModule } = require('../lib/storage');

const router = Router();

// https://www.terraform.io/docs/registry/api.html#download-source-code-for-a-specific-module-version
router.get('/:namespace/:name/:provider/:version/download', async (req, res, next) => {
  const options = { ...req.params };

  const module = await findOneModule(options);

  if (!module) {
    return next();
  }

  res.set('X-Terraform-Get', `/v1/modules/tarball/${module.location}`);
  return res.status(204).send();
});

// https://www.terraform.io/docs/registry/api.html#download-the-latest-version-of-a-module
router.get('/:namespace/:name/:provider/download', async (req, res, next) => {
  const options = { ...req.params };

  const module = await getModuleLatestVersion(options);

  if (!module) {
    return next();
  }

  const target = `/v1/modules/${module.namespace}/${module.name}/${module.provider}/${module.version}/download`;
  return res.redirect(target);
});

// download a module
router.get('/tarball/:namespace/:name/:provider/:version/*.tar.gz', async (req, res, next) => {
  const options = { ...req.params };

  const module = await findOneModule(options);

  if (!module) {
    return next();
  }

  const file = await getModule(module.location);
  await increaseModuleDownload(options);
  return res.attachment('module.tar.gz').type('gz').send(file);
});

module.exports = router;
