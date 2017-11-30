const { Router } = require('express');

const router = Router();

// https://www.terraform.io/docs/registry/api.html#list-available-versions-for-a-specific-module
router.get('/:namespace/:name/:provider/versions', (req, res) => {
  // TODO: return module's versions
  res.render('modules/versions', {});
});

module.exports = router;
