const { Router } = require('express');

const router = Router();

// ref: https://www.terraform.io/docs/internals/remote-service-discovery.html
router.get('/.well-known/terraform.json', (req, res) => {
  res.json({
    'modules.v1': `https://${process.env.CITIZEN_HOSTNAME || 'localhost'}/v1/`,
  });
});

module.exports = router;
