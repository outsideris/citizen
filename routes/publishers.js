// https://www.terraform.io/docs/internals/provider-registry-protocol.html
const { Router } = require('express');

const {
  savePublisher,
  findAllPublishers,
  findOnePublisher,
  updatePublisher,
} = require('../stores/store');

const router = Router();

router.get('/', async (req, res) => {
  const publishers = await findAllPublishers();
  res.send(publishers);
});

router.get('/:name', async (req, res) => {
  const publisher = await findOnePublisher({ name: req.params.name });
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

  const existingPublisher = await findOnePublisher({ name });
  if (req.query.force !== 'true' && existingPublisher) {
    res.statusMessage = `Publisher with name ${name} already exists`;
    return res.status(400).send();
  }

  // If existing publisher and we want to override
  if (existingPublisher && req.query.force === 'true') {
    const updatedPublisher = await updatePublisher({
      name, url, trustSignature, gpgKeys,
    });

    return res.send(updatedPublisher);
  }

  try {
    const response = await savePublisher({
      name, url, trustSignature, gpgKeys,
    });
    return res.status(201).send(response);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
