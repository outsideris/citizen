const { Router } = require('express');

const router = Router();

if (!process.env.CITIZEN_HOSTNAME) { throw new Error('CITIZEN_HOSTNAME required.'); }

// ref: https://www.terraform.io/docs/internals/remote-service-discovery.html
router.get('/.well-known/terraform.json', (req, res) => {
  res.json({
    'modules.v1': `https://${process.env.CITIZEN_HOSTNAME}/v1/`,
  });
});

module.exports = router;
