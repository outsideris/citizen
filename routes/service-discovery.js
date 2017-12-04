const { Router } = require('express');

const router = Router();

const HOSTNAME = process.env.HOSTNAME;

if (!HOSTNAME) { throw new Error('HOSTNAME required.'); }

// ref: https://www.terraform.io/docs/internals/remote-service-discovery.html
router.get('/.well-known/terraform.json', (req, res) => {
  res.json({
    'modules.v1': `https://${HOSTNAME}/v1/`,
  });
});

module.exports = router;
