const { Router } = require('express');

const { findAll } = require('../lib/store');

const router = Router();

// https://www.terraform.io/docs/registry/api.html#list-modules
router.get(['/', '/:namespace'], async (req, res) => {
  const options = {
    ...req.query,
  };
  if (req.params.namespace) {
    options.namespace = req.params.namespace;
  }

  const modules = await findAll(options);
  res.render('modules/list', modules);
});

module.exports = router;
