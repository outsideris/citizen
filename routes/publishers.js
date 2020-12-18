// https://www.terraform.io/docs/internals/provider-registry-protocol.html

const { Router } = require('express');

const {
  save, findAll, findOne, update,
} = require('../lib/publishers-store');

const router = Router();

router.get('/', async (req, res) => {
  const publishers = await findAll();
  res.send(publishers);
});

router.get('/:name', async (req, res) => {
  const publisher = await findOne({ name: req.params.name });
  res.send(publisher);
});

// JSON Payload { name, url, trustedSignature, gpgKeys: [{ keyId, asciiArmor }]}
router.post('/', async (req, res, next) => {
  const {
    name,
    url,
    trustSignature,
    gpgKeys,
  } = req.body;

  const existingPublisher = await findOne({ name });
  if (req.query.force !== 'true' && existingPublisher) {
    res.statusMessage = `Publisher with name ${name} already exists`;
    return res.status(400).send();
  }

  // If existing publisher and we want to override
  if (existingPublisher && req.query.force === 'true') {
    const updatedPublisher = await update({
      name, url, trustSignature, gpgKeys,
    });

    res.send(updatedPublisher);
  } else {
    try {
      const response = await save({
        name, url, trustSignature, gpgKeys,
      });
      res.status(201).send(response);
    } catch (err) {
      next(err);
    }
  }
});

module.exports = router;
