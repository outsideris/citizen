// https://www.terraform.io/docs/internals/provider-registry-protocol.html
const { Router } = require('express');
const multiparty = require('multiparty');
const { v4: uuid } = require('uuid');

const crypto = require('crypto');
const { join } = require('path');
const logger = require('../lib/logger');
const { saveProvider: saveProviderStorage, hasProvider, getProvider } = require('../lib/storage');
const {
  saveProvider,
  getProviderVersions,
  findProviderPackage,
  findAllPublishers,
} = require('../stores/store');

const router = Router();

// eslint-disable-next-line consistent-return
router.get('/:namespace/:type/:version/download/:os/:arch/zip', async (req, res, next) => {
  const options = { ...req.params };

  const providerPackage = await findProviderPackage(options);

  if (!providerPackage) {
    return next();
  }

  const platform = providerPackage.platforms
    .find((p) => p.os === options.os && p.arch === options.arch);

  const file = await getProvider(platform.location);

  res.attachment(platform.filename).send(file);
});

// https://www.terraform.io/docs/internals/provider-registry-protocol.html#list-available-versions
router.get('/:namespace/:type/versions', async (req, res, next) => {
  const options = { ...req.params };

  const versions = await getProviderVersions(options);

  if (!versions) {
    return next();
  }

  if (versions.length === 0) {
    return res.status(404).send({});
  }

  return res.render('providers/versions', { versions: versions.versions });
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

  const trustedGpgKeys = publishersResponse.publishers
    .reduce((arr, publisher) => arr.concat(publisher.gpgKeys), []);

  if (!providerPackage) {
    return next();
  }

  const platform = providerPackage.platforms
    .find((p) => p.os === options.os && p.arch === options.arch);

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
          requestName: part.name,
        });
      } else {
        const value = Buffer.concat(formData[id]).toString();
        if (Object.keys(fields).indexOf(part.name) !== -1) {
          fields[part.name] = fields[part.name] instanceof Array
            ? fields[part.name]
            : [fields[part.name]];
          fields[part.name] = fields[part.name].concat(value);
        } else {
          fields[part.name] = value;
        }
      }
    });
  });

  form.on('close', async () => {
    try {
      if (files.length === 0) {
        res.statusMessage = 'You must attach at least one file';
        return res.status(400).send({ error: 'There are no files attached' });
      }

      if (files.findIndex((f) => f.requestName === 'sha256sums') === -1) {
        res.statusMessage = 'You must attach SHA 256 sums file';
        return res.status(400).send({ error: 'There is no sums file attached' });
      }

      if (files.findIndex((f) => f.requestName === 'signature') === -1) {
        res.statusMessage = 'You must attach signature of sums file';
        return res.status(400).send({ error: 'There is no signature file attached' });
      }

      const providerFiles = files.filter((f) => f.requestName === 'provider');

      // Ensure os/arch fields are arrays
      fields.os = fields.os instanceof Array ? fields.os : [fields.os];
      fields.arch = fields.arch instanceof Array ? fields.arch : [fields.arch];

      if (
        (!fields.os || (fields.os && fields.os.length !== providerFiles.length))
        || (!fields.arch || (fields.arch && fields.arch.length !== providerFiles.length))
      ) {
        res.statusMessage = `The os/arch is not matching uploaded files: ${JSON.stringify(fields)}`;
        return res.status(400).send({ error: 'You must provide list of os/arch matching submitted files' });
      }

      for (let i = 0; i < providerFiles.length; i += 1) {
        const file = providerFiles[i];
        if (file.filename.indexOf(`${fields.os[i]}_${fields.arch[i]}.zip`) === -1) {
          res.statusMessage = 'OS/Arch fields do not match uploaded files (order is important)';
          return res.status(400).send({
            error: res.statusMessage,
            filename: file.filename,
            fields,
          });
        }

        // It's ok to call async hasProvider in the loop here
        // eslint-disable-next-line no-await-in-loop
        const providerExistenceCheck = await hasProvider(join(destPath, file.filename));
        if (providerExistenceCheck) {
          res.statusMessage = 'Provider already exists';
          return res.status(409).send({
            error: res.statusMessage,
            filename: file.filename,
          });
        }
      }

      const provider = {
        namespace,
        type,
        version,
        gpgKeys: [],
        platforms: [],
      };

      const promises = files.map(async (archive) => {
        const location = `${destPath}/${archive.filename}`;
        await saveProviderStorage(location, archive.file);
      });

      providerFiles.forEach(async (archive, index) => {
        const shasum = crypto.createHash('sha256').update(archive.file).digest('hex');
        const location = `${destPath}/${archive.filename}`;

        provider.platforms.push({
          os: fields.os[index],
          arch: fields.arch[index],
          location,
          filename: archive.filename,
          shasum,
        });
      });

      await Promise.all(promises);
      await saveProvider(provider);

      return res.status(201).render('providers/register', provider);
    } catch (e) {
      logger.error(e);
      return next(e);
    }
  });

  form.parse(req);
});

module.exports = router;
