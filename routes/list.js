const { Router } = require('express');

const { findAll } = require('../lib/store');

const router = Router();

// https://www.terraform.io/docs/registry/api.html#search-modules
router.get('/search', async (req, res) => {
  if (!req.query.q) {
    return res.status(400).render('error', {
      message: 'q parameter required.',
    });
  }

  // `q` search in `name` field.
  // It could be extended to other fields. Specification said it depends on registry implementation.
  const options = {
    ...req.query,
    selector: {
      name: {
        $regex: new RegExp(req.query.q),
      },
    },
    q: null,
  };

  if (req.params.namespace) {
    options.namespace = req.params.namespace;
  }

  const modules = await findAll(options);
  return res.render('modules/list', modules);
});

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
