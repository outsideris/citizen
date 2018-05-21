const { Router } = require('express');
const multiparty = require('multiparty');

const logger = require('../lib/logger');
const { parseHcl } = require('../lib/util');
const { saveModule, hasModule } = require('../lib/storage');
const { save, getLatestVersion, findOne } = require('../lib/store');

const router = Router();

// register a module with version
router.post('/:namespace/:name/:provider/:version', (req, res, next) => {
  const {
    namespace,
    name,
    provider,
    version,
  } = req.params;
  const destPath = `${namespace}/${name}/${provider}/${version}`;
  let tarball;
  let filename;
  let owner = '';

  const form = new multiparty.Form();

  form.on('error', (err) => {
    logger.error(`Error parsing form: ${err.stack}`);
    next(err);
  });

  form.on('part', async (part) => {
    part.on('error', (err) => {
      logger.error(`Error parsing form: ${err.stack}`);
      next(err);
    });

    const ownerBuf = [];
    const file = [];
    part.on('data', (buffer) => {
      if (!part.filename && part.name === 'owner') {
        ownerBuf.push(buffer);
      }
      if (part.filename) {
        file.push(buffer);
      }
    });
    part.on('end', async () => {
      if (!part.filename && part.name === 'owner') {
        owner = Buffer.concat(ownerBuf).toString();
      }
      if (part.filename) {
        ({ filename } = part);
        tarball = Buffer.concat(file);
      }
    });
  });

  form.on('close', async () => {
    try {
      const exist = await hasModule(`${destPath}/${filename}`);
      if (exist) {
        const error = new Error('Module exist');
        error.status = 409;
        error.message = `${destPath} is already exist.`;
        return next(error);
      }

      const fileResult = await saveModule(`${destPath}/${filename}`, tarball);
      const definition = await parseHcl(name, tarball);
      const metaResult = await save({
        namespace,
        name,
        provider,
        version,
        owner,
        location: `${destPath}/${filename}`,
        definition,
      });

      if (fileResult && metaResult.ok) {
        return res.status(201).render('modules/register', {
          id: destPath,
          owner,
          namespace,
          name,
          provider,
          version,
          published_at: new Date(),
        });
      }

      return next(new Error());
    } catch (e) {
      logger.error(e);
      return next(e);
    }
  });

  form.parse(req);
});

// https://www.terraform.io/docs/registry/api.html#get-a-specific-module
router.get('/:namespace/:name/:provider/:version', async (req, res, next) => {
  const options = {
    namespace: req.params.namespace,
    name: req.params.name,
    provider: req.params.provider,
    version: req.params.version,
  };

  const module = await findOne(options);

  if (!module) {
    return next();
  }

  return res.render('modules/module', module);
});

// https://www.terraform.io/docs/registry/api.html#latest-version-for-a-specific-module-provider
router.get('/:namespace/:name/:provider', async (req, res, next) => {
  const options = {
    namespace: req.params.namespace,
    name: req.params.name,
    provider: req.params.provider,
  };

  const module = await getLatestVersion(options);

  if (!module) {
    return next();
  }

  return res.render('modules/latest-version', module);
});

module.exports = router;
