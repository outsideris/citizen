const { Router } = require('express');

const { findOne, getLatestVersion } = require('../lib/store');

const router = Router();

// https://www.terraform.io/docs/registry/api.html#download-source-code-for-a-specific-module-version
router.get('/:namespace/:name/:provider/:version/download', async (req, res, next) => {
  const options = {
    ...req.params,
  };

  const module = await findOne(options);

  if (!module) {
    return next();
  }

  res.set('X-Terraform-Get', `/v1/modules/tarball/${module.location}`);
  return res.status(204).send();
});

// https://www.terraform.io/docs/registry/api.html#download-the-latest-version-of-a-module
router.get('/:namespace/:name/:provider/download', async (req, res, next) => {
  const options = {
    ...req.params,
  };

  const module = await getLatestVersion(options);

  if (!module) {
    return next();
  }

  const target = `/v1/modules/${module.namespace}/${module.name}/${module.provider}/${module.version}/download`;
  return res.redirect(target);
});

module.exports = router;
