const { Router } = require('express');

const router = Router();

// ref: https://www.terraform.io/docs/internals/remote-service-discovery.html
router.get('/.well-known/terraform.json', (req, res) => {
  // match with https://registry.terraform.io/.well-known/terraform.json
  res.json({
    'modules.v1': '/v1/modules/',
  });
});

module.exports = router;
