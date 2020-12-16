// https://www.terraform.io/docs/internals/provider-registry-protocol.html

const { Router } = require('express');
const multiparty = require('multiparty');
const { v4: uuid } = require('uuid');

const crypto = require('crypto');
const { reject } = require('lodash');
const logger = require('../lib/logger');

const {
  save, findAll, findOne,
} = require('../lib/publishers-store');

const router = Router();

router.get('/', async (req, res, next) => {
  const publishers = await findAll();
  res.send(publishers);
});

router.get('/:name', async (req, res, next) => {
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

  try {
    const response = await save({
      name, url, trustSignature, gpgKeys,
    });
    res.status(201).send(response);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
