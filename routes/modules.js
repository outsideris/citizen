const { Router } = require('express');
const multiparty = require('multiparty');

const logger = require('../lib/logger');
const { saveModule, hasModule } = require('../lib/storage');

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

    const buffers = [];
    part.on('data', buffer => buffers.push(buffer));
    part.on('end', async () => {
      ({ filename } = part);
      tarball = Buffer.concat(buffers);
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

      const result = await saveModule(`${destPath}/${filename}`, tarball);
      if (result.ETag) {
        return res.status(201).render('modules/register', {
          id: destPath,
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

// https://www.terraform.io/docs/registry/api.html#list-available-versions-for-a-specific-module
router.get('/:namespace/:name/:provider/versions', (req, res) => {
  // TODO: return module's versions
  res.render('modules/versions', {});
});

module.exports = router;
