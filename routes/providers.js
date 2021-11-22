// https://www.terraform.io/docs/internals/provider-registry-protocol.html
const { Router } = require('express');
const multiparty = require('multiparty');
const { v4: uuid } = require('uuid');

const logger = require('../lib/logger');
const { saveProvider: saveProviderStorage, getProvider } = require('../lib/storage');
const {
  saveProvider,
  findOneProvider,
  increaseProviderDownload,
  getProviderVersions,
  findProviderPackage,
} = require('../stores/store');
const { extractShasum } = require('../lib/util');

const router = Router();

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
  let data;

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
        data = Buffer.concat(formData[id]).toString();
      }
    });
  });

  form.on('close', async () => {
    try {
      data = JSON.parse(data);
    } catch (e) {
      const error = new Error('Invalid JSON format');
      error.status = 400;
      error.message = 'There is invalid JSON for a data field';
      return next(error);
    }

    try {
      if (files.length < 3) {
        const error = new Error('Not enough files');
        error.status = 400;
        error.message = 'You must attach at least three files including provider, shashum and signature';
        return next(error);
      }

      const shasumsFile = files.filter((f) => f.filename.endsWith('SHA256SUMS'));
      if (shasumsFile.length < 1) {
        const error = new Error('No SHA256SUM file');
        error.status = 400;
        error.message = 'There is no SHA 256 SUMS file attached';
        return next(error);
      }

      if (!files.some((f) => f.filename.endsWith('SHA256SUMS.sig'))) {
        const error = new Error('No signature file');
        error.status = 400;
        error.message = 'There is no signature file attached';
        return next(error);
      }

      const providerFiles = files.filter((f) => f.filename.endsWith('.zip'));
      if (!data.platforms || data.platforms.length !== providerFiles.length) {
        const error = new Error('Different count between data and files');
        error.status = 400;
        error.message = 'You must provide matched platform data and provider files';
        return next(error);
      }

      const isFilesMatched = data.platforms
        .every((p) => providerFiles.some((f) => f.filename === `terraform-provider-${type}_${version}_${p.os}_${p.arch}.zip`));
      if (!isFilesMatched) {
        const error = new Error('Unmatched platform data and files');
        error.status = 400;
        error.message = 'You must provide list of platform(os/arch) matching submitted files';
        return next(error);
      }

      const hasProvider = await findOneProvider({
        namespace: data.namespace,
        type: data.type,
        version: data.version,
      });

      if (hasProvider) {
        const error = new Error('The provider already exists');
        error.status = 409;
        error.message = 'You must submit different provider with namespace, type or version';
        return next(error);
      }

      const shaFileMap = await extractShasum(shasumsFile[0].file.toString());
      data.platforms.forEach((p) => {
        p.shasum = shaFileMap[p.filename]; // eslint-disable-line no-param-reassign
      });

      // save files
      const promises = files.map(async (archive) => {
        const location = `${destPath}/${archive.filename}`;
        await saveProviderStorage(location, archive.file);
      });
      await Promise.all(promises);

      const savedData = await saveProvider(data);
      return res.status(201).render('providers/register', savedData);
    } catch (e) {
      logger.error(e);
      return next(e);
    }
  });

  form.parse(req);
});

// https://www.terraform.io/docs/internals/provider-registry-protocol.html#list-available-versions
router.get('/:namespace/:type/versions', async (req, res, next) => {
  const options = { ...req.params };

  const versions = await getProviderVersions(options);
  if (!versions) { return next(); }

  if (versions.length === 0) {
    return res.status(404).send({});
  }

  return res.render('providers/versions', { versions: versions.versions });
});

// https://www.terraform.io/docs/internals/provider-registry-protocol.html#find-a-provider-package
router.get('/:namespace/:type/:version/download/:os/:arch', async (req, res, next) => {
  const options = { ...req.params };

  const providerPackage = await findProviderPackage(options);
  if (!providerPackage) { return next(); }

  const platform = providerPackage.platforms
    .find((p) => p.os === options.os && p.arch === options.arch);

  const viewModel = {
    protocols: providerPackage.protocols,
    filename: platform.filename,
    os: platform.os,
    arch: platform.arch,
    downloadUrl: `/v1/providers/${options.namespace}/${options.type}/${options.version}/download/${options.os}/${options.arch}/zip`,
    shaSumsUrl: `/v1/providers/${options.namespace}/${options.type}/${options.version}/sha256sums`,
    shaSumsSignatureUrl: `/v1/providers/${options.namespace}/${options.type}/${options.version}/sha256sums.sig`,
    shasum: platform.shasum,
    gpgPublicKeys: providerPackage.gpgPublicKeys,
    published_at: providerPackage.published_at,
    downloads: providerPackage.downloads,
    last_downloaded_at: providerPackage.last_downloaded_at,
  };

  return res.render('providers/providerPackage', viewModel);
});

// for downloading
router.get('/:namespace/:type/:version/download/:os/:arch/zip', async (req, res, next) => {
  try {
    const options = { ...req.params };

    const providerPackage = await findProviderPackage(options);
    if (!providerPackage) { return next(); }

    const platform = providerPackage.platforms
      .find((p) => p.os === options.os && p.arch === options.arch);

    const provider = await findOneProvider(options);
    const protocols = provider.protocols.map((prot) => Math.floor(prot));
    res.header('x-terraform-protocol-version', Math.min(...protocols));
    res.header('x-terraform-protocol-versions', provider.protocols.join(', '));

    const file = await getProvider(`${options.namespace}/${options.type}/${options.version}/${platform.filename}`);
    await increaseProviderDownload(options);
    return res.attachment(platform.filename).send(file);
  } catch (e) {
    return next(e);
  }
});

router.get('/:namespace/:type/:version/sha256sums', async (req, res, next) => {
  try {
    const options = { ...req.params };

    const sumsLocation = `${options.namespace}/${options.type}/${options.version}/terraform-provider-${options.type}_${options.version}_SHA256SUMS`;
    const shasumsContent = await getProvider(sumsLocation);
    if (!shasumsContent) { return next(); }

    const provider = await findOneProvider(options);
    const protocols = provider.protocols.map((prot) => Math.floor(prot));
    res.header('x-terraform-protocol-version', Math.min(...protocols));
    res.header('x-terraform-protocol-versions', provider.protocols.join(', '));

    return res
      .contentType('text/plain')
      .send(shasumsContent.toString('utf8'));
  } catch (e) {
    return next(e);
  }
});

router.get('/:namespace/:type/:version/sha256sums.sig', async (req, res, next) => {
  try {
    const options = { ...req.params };
    const sigLocation = `${options.namespace}/${options.type}/${options.version}/terraform-provider-${options.type}_${options.version}_SHA256SUMS.sig`;
    const sig = await getProvider(sigLocation);
    if (!sig) { return next(); }

    const provider = await findOneProvider(options);
    const protocols = provider.protocols.map((prot) => Math.floor(prot));
    res.header('x-terraform-protocol-version', Math.min(...protocols));
    res.header('x-terraform-protocol-versions', provider.protocols.join(', '));

    return res
      .set('Content-Type', 'application/octet-stream')
      .set('Content-disposition', `attachment; filename=terraform-provider-${options.type}_${options.version}_SHA256SUMS.sig`)
      .send(sig);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
