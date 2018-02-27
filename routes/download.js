const { Router } = require('express');

const { findOne } = require('../lib/store');

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

module.exports = router;
