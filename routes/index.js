const { Router } = require('express');

const router = Router();

router.get('/health', (req, res) => {
  res.send('ok');
});

module.exports = router;
