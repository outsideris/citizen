const { Router } = require('express');

const router = Router();

if (!process.env.HOSTNAME) { throw new Error('HOSTNAME required.'); }

// ref: https://www.terraform.io/docs/internals/remote-service-discovery.html
router.get('/.well-known/terraform.json', (req, res) => {
  res.json({
    'modules.v1': `https://${process.env.HOSTNAME}/v1/`,
  });
});

module.exports = router;
