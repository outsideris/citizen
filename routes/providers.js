// https://www.terraform.io/docs/internals/provider-registry-protocol.html

const { Router } = require('express');
const multiparty = require('multiparty');
const { v4: uuid } = require('uuid');

const crypto = require('crypto');
const logger = require('../lib/logger');

const { saveProvider, hasProvider, getProvider } = require('../lib/storage');
const {
  save, getVersions, findProviderPackage,
} = require('../lib/providers-store');
const {
  findAll: findAllPublishers,
} = require('../lib/publishers-store');

const { findAll } = require('../lib/providers-store');

const router = Router();

router.get('/:namespace/:type/:version/download/:os/:arch/zip', async (req, res, next) => {
  const options = { ...req.params };

  const providerPackage = await findProviderPackage(options);

  if (!providerPackage) {
    return next();
  }

  const platform = providerPackage.platforms.find((p) => p.os === options.os && p.arch === options.arch);

  const file = await getProvider(platform.location);

  res.attachment(platform.filename).send(file);
});

// https://www.terraform.io/docs/internals/provider-registry-protocol.html#list-available-versions
router.get('/:namespace/:type/versions', async (req, res, next) => {
  const options = { ...req.params };

  const versions = await getVersions(options);

  if (!versions) {
    return next();
  }

  if (versions.length === 0) {
    return res.status(404).send({});
  }

  return res.render('providers/versions', { versions });
});

router.get('/:namespace/:type/:version/sha256sums', async (req, res) => {
  const options = { ...req.params };

  const sumsLocation = `${options.namespace}/${options.type}/${options.version}/terraform-provider-${options.type}_${options.version}_SHA256SUMS`;
  const response = await getProvider(sumsLocation);

  res
    .header('x-terraform-protocol-version', '5')
    .header('x-terraform-protocol-versions', '5.0')
    .contentType('text/plain')
    .send(response);
});

router.get('/:namespace/:type/:version/sha256sums.sig', async (req, res) => {
  const options = { ...req.params };
  const sigLocation = `${options.namespace}/${options.type}/${options.version}/terraform-provider-${options.type}_${options.version}_SHA256SUMS.sig`;
  const response = await getProvider(sigLocation);

  res
    .send(response);
});

// https://www.terraform.io/docs/internals/provider-registry-protocol.html#find-a-provider-package
router.get('/:namespace/:type/:version/download/:os/:arch', async (req, res, next) => {
  const options = { ...req.params };

  const providerPackage = await findProviderPackage(options);
  const publishersResponse = await findAllPublishers();

  const trustedGpgKeys = publishersResponse.publishers.reduce((arr, publisher) => arr.concat(publisher.gpgKeys), []);

  if (!providerPackage) {
    return next();
  }

  const platform = providerPackage.platforms.find((p) => p.os === options.os && p.arch === options.arch);

  const viewModel = {
    filename: platform.filename,
    shasum: platform.shasum,
    os: platform.os,
    arch: platform.arch,
    downloadUrl: `/v1/providers/${options.namespace}/${options.type}/${options.version}/download/${options.os}/${options.arch}/zip`,
    shaSumsUrl: `/v1/providers/${options.namespace}/${options.type}/${options.version}/sha256sums`,
    shaSumsSignatureUrl: `/v1/providers/${options.namespace}/${options.type}/${options.version}/sha256sums.sig`,
    gpgKeys: trustedGpgKeys,
  };

  return res.render('providers/providerPackage', viewModel);
});

// register a provider with version
router.post('/:namespace/:type/:version', (req, res, next) => {
  const {
    namespace,
    type,
    version,
  } = req.params;

  const destPath = `${namespace}/${type}/${version}`;

  const form = new multiparty.Form();

  form.on('error', (err) => {
    logger.error(`Error parsing form: ${err.stack}`);
    next(err);
  });

  const formData = {};
  const files = [];
  const fields = {};

  form.on('part', async (part) => {
    const id = uuid();
    formData[id] = [];

    part.on('error', (err) => {
      logger.error(`Error parsing form: ${err.stack}`);
      next(err);
    });

    part.on('data', (buffer) => {
      formData[id].push(buffer);
    });

    part.on('end', async () => {
      if (part.filename) {
        files.push({
          file: Buffer.concat(formData[id]),
          filename: part.filename,
        });
      } else {
        const value = Buffer.concat(formData[id]).toString();
        if (part.name.match(/\[\]$/)) {
          fields[part.name] = fields[part.name] || [];
          fields[part.name].push(value);
        } else {
          fields[part.name] = value;
        }
      }
    });
  });

  form.on('close', async () => {
    try {
      // const exist = await hasProvider(`${destPath}/${filename}`);
      // if (exist) {
      //   const error = new Error('Provider exist');
      //   error.status = 409;
      //   error.message = `${destPath} is already exist.`;
      //   return next(error);
      // }

      // const gpgKeys = [
      //   {
      //     keyId: publicKeyId,
      //     asciiArmor: publicKey.toString(),
      //   },
      // ];

      const provider = {
        namespace,
        type,
        gpgKeys: [],
        version,
        platforms: [],
      };

      const promises = files.map(async (archive) => {
        const location = `${destPath}/${archive.filename}`;
        await saveProvider(location, archive.file);
      });

      const zipFiles = files.filter((f) => f.filename.match(/\.zip$/i));
      zipFiles.forEach(async (archive, index) => {
        const shasum = crypto.createHash('sha256').update(archive.file).digest('hex');
        const location = `${destPath}/${archive.filename}`;

        provider.platforms.push({
          os: fields['os[]'][index],
          arch: fields['arch[]'][index],
          location,
          filename: archive.filename,
          shasum,
        });
      });

      await Promise.all(promises);
      await save(provider);

      return res.status(201).render('providers/register', provider);
    } catch (e) {
      logger.error(e);
      return next(e);
    }
  });

  form.parse(req);
});

module.exports = router;
