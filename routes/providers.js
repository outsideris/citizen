// https://www.terraform.io/docs/internals/provider-registry-protocol.html

const { Router } = require('express');
const multiparty = require('multiparty');
const { v4: uuid } = require('uuid');

const crypto = require('crypto');
const logger = require('../lib/logger');
const { parseHcl } = require('../lib/util');

const { saveProvider, hasProvider, getProvider } = require('../lib/storage');
const {
  save, getLatestVersion, getVersions, findOne, findProviderPackage,
  findById,
} = require('../lib/providers-store');
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

  console.log('FILE', file);

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

router.get('/:namespace/:type/:version/sha256sums', async (req, res, next) => {
  const options = { ...req.params };

  const sumsLocation = `${options.namespace}/${options.type}/${options.version}/terraform-provider-${options.type}_${options.version}_SHA256SUMS`;
  const response = await getProvider(sumsLocation);

  res
    .header('x-terraform-protocol-version', '5')
    .header('x-terraform-protocol-versions', '5.0')
    .contentType('text/plain')
    .send(response);
});

router.get('/:namespace/:type/:version/sha256sums.sig', async (req, res, next) => {
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
    gpgKeys: [{
      keyId: '0E9892CBEFA74CE1E75EC86B9F2EFF11272F2D2A',
      asciiArmor: `-----BEGIN PGP PUBLIC KEY BLOCK-----

mQINBF/ZA8gBEADaWV+MudgxQqsgvtC5lHQ/A0ivgIgs0BwiQI75uDia516e9dbB
GRGNjD7LC2tlMpTGNbibXIxlxqTPmIeyh/YBU/wRhFxrPVcF9y0Ue7W8aVR+iItw
io68CV5zYL4CvPx6tsisHxiYiuEDxt5x0Wlmaw5ikQxS062DWyJYKf+lpArxLQqC
a6LWGepS78LJenwO9Aai8EhQllbeHZ55KpzaYbZ3c1wtSsU1lFWQ+Vt3Ho0eFTqE
ep182o+URSxvpcjlEkE3PVn+E146ReZKXk+CIeTGkvM7PSPrtDMhdrlI4dEvxJO5
G6VI2LmmrqQtAdPyaGRkrDVt0Nlcwg8vwYGt6lnxDh/LeTIuYHxKLMgYR79LD6Ih
qrhxC0oETKCBOV9p9l/kxLNV+7KMkxI60fzG7dPhQLHnUZ1+BHCZYCPqplhYGZAK
8dSGf4UYTZpnUus0jyrpgbEpfRaOA5ZhSizryrcJnH4iUacgxP1ZjZpeuZaY9IV+
o36WdSyicHpt3+ej2y9ysYtpZ1u/zmhwj5Nem6K/0TbZUyYxZXhCy4k2lta++8K1
QG5L8LHkIc/UXkDC9b8CpVCHSOhdoibEH07YhiToDFGrwT3ULZX+ymISw/zbb0cm
msFATvszvanUVeAAbBC6RBlk9CcvP1AttH1M1PUuSTL70snOTKWLpwawaQARAQAB
tDpTdGFuaXNsYXcgV296bmlhayA8c3RhbmlzbGF3Lndvem5pYWtAY29udHJhY3Rv
ci5heGF4bC5jb20+iQJOBBMBCAA4FiEEDpiSy++nTOHnXshrny7/EScvLSoFAl/Z
A8gCGwMFCwkIBwIGFQoJCAsCBBYCAwECHgECF4AACgkQny7/EScvLSpDng//brsQ
DyfUeIu+SrBCknNhynPJiNdN6iK7H2pFLPOwUkriO0GMISbOG8/VHeMsYkxw+yvf
bDgkOGjvS+QC0CcODTekoJEfXXPjkHFNCLnma24ndKLDcaLSyUSG9X1MLpj1lowp
JteVtKZrE+prbnWT14E+7ByTcRGLI2RygveZTcJPR335J9JGafTdFEmUbQy3/577
5jpE0GDKPP8ukcGv+mMI1RYjob8l1ip+IUueSblTjjG6E+CI/y5BhaOe9fd4Opq7
Kvtg6zL263Q6Qk+2T0nUksYgEgSRIStW5mtyWjGpW3jfh32lEaPVNlTrivF/SU9w
L9z7iJmlcwcdrUtUx+4+yQgRcfRUWBwErIJ56RhFLGkuVq5o5myPQ30VhvBQ9RIJ
Cu9RTiE8y+Pa38mhoQBH/W+YIEgqGcdvNACeEFzM5y7p2sM8P76oOJXkeCN4bWGk
ePVz4cXHkXNhn0vFycge8AnCKgVMLrJsoQEGuOk7s/XWEW4TP98axsfzyGSjywVJ
zVeN0gcTNaKFh7qNjuHlULs+ijnSb6brQnfnASPLlkB1Sxmjb5MALxlhHkqocA1n
DbBF0bsOTMU4+mvVRUGivzuTjI+nnbNcF+kegJKWxza2pSFcN7zfCXsG4SWbvbDD
Q0/56Q7HwetJxL5d5M4Lni1XKzBGF4d2cy6ltb65Ag0EX9kDyAEQAJ+aDxeqHl3S
w97RXRSwqs6zBGoW3qxScs8F6+xHD1h+fAc4tKZwtKo1hXuKIaqHtRt4Iip3w9ep
+Fs97KxXhzCvXRroIgx2gXB1KdecfOcWLjMoVxjb7d89NiOyFJBUxnyO24Wz1LqB
VuMBRX+MDoHK5Z3huHx97DbrutYozBmbWfLjGWWldxDf75JrD7o11Bu/Wwo9UX6I
1PR6/unaLc/Usad3Dv9wev7VX1vNf0GfKzeZ/O2A07PX/HIZo42/1DlH7TyPUbFD
cIBnTVfkh9DNPCEH/1UwmyOBkst2n2xp0r/376cyK8YI2EO0FalI1aHzuRm+QDyp
jx3wJDR30H1QGal6tniJxCd7PvjsOjXjuOY68iKYrShkZv5hYfB4wTRavk3SFzee
y0OZqfJxILV1uYONflxO70svSzmNdKTp2qW24b3Q9Hco+5Eo8drd1MlFOLAVWhNL
7AP/50zMXJSPxGRwCp1K8UUktMs/EKiV16OIBeqtNIfeFE6shEES/3iNzz3t2KY5
r3hr767VwG1ro6m362ewrkIhotQkVIIKMFuzJsF1zKZBLRMccGGsO07IHYuuTO4t
K3J34jWwKC1rFa2HdEsVboAgpvqzbVE/kNvkRGcuWneNkVf/P459hpM6fTlHTpyu
oraQrtKhsQTgAuCyDhu28SXziMMVtWGrABEBAAGJAjYEGAEIACAWIQQOmJLL76dM
4edeyGufLv8RJy8tKgUCX9kDyAIbDAAKCRCfLv8RJy8tKvc+EACuzKYOLmMY+/qR
4I+hK8Mk9bWEf+WX+bVcWzcG8hTUbd6I1ikLyPvqy2tFeYpYZvB1J/jXfG91fxcB
ip6i4wMXWyiFTtMi4hIL7Iux/AY3UY0j7wS7Wwa4Q2b4D9Ubpn42TXwAA+zSj3Zs
8efkTBoN3t2WIVNqI3wD5hL05Hlg1EqMECjU31fTHOZ9zjcPHClSAyXVMhNkC4p6
G/GfUGhw5Bdknp4nFa6Fc0SjS3eO2X++7hv5QIDCNsmKoF8OdkVKOUUuNvRrjyjl
G+Tchn5DO71oIEV8Uq9YLc4X53yrUDsVMG9JtpLcWKGR7YRp0woYxsdNJ1wcqLua
dOLIxQbLNaz+N2xqlmid2uK69nrE0fIrfnB0WSmOtG68KXLLoijRMpOTJb199As2
D4bPdThJhjivxZ9TvlZoypFt+KKSGZDI6r70GAjqfTLvne+Z15maHTy6G1JqE9D4
3DHM4VIf6ZGwc4GyZG7vyRwEetnUsyUb04YEOfEIiRJLPbOJZcwWt2egZytU/dJO
w+ZhzFd9uXP0GYeOxD+jub0YyDjWfWDW2nQ8W0wKQ4J21AFnVh0N4SPa4/ELzlm/
dHJaqqlZK22O8PRiRGe4W48W0+6cZrSblnaQqDPk5UNEsq6Qp9x9pgoCjT2Td7hG
selCadNAcyXWzjyjxFLzFwm5B+288g==
=eO0L
-----END PGP PUBLIC KEY BLOCK-----`,
    }],
  };

  return res.render('providers/providerPackage', viewModel);
});

// register a provider with version
router.post('/:namespace/:type/:version/:os/:arch', (req, res, next) => {
  const {
    namespace,
    type,
    version,
    os,
    arch,
  } = req.params;
  const destPath = `${namespace}/${type}/${version}/${os}/${arch}`;

  let filename;

  let archive;
  let signature;
  let sha256sums;
  let publicKey;
  let publicKeyId;

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

    const archiveBuffer = [];
    const signatureBuffer = [];
    const pubkeyBuffer = [];
    const pubKeyIdBuffer = [];
    const sha256sumsBuffer = [];

    part.on('data', (buffer) => {
      if (part.name === 'gpgKeyId') {
        pubKeyIdBuffer.push(buffer);
      }

      if (part.name === 'sha256sums') {
        sha256sumsBuffer.push(buffer);
      }

      if (part.name === 'pubkey') {
        pubkeyBuffer.push(buffer);
      }

      if (part.name === 'signature') {
        signatureBuffer.push(buffer);
      }

      if (part.name === 'provider') {
        archiveBuffer.push(buffer);
      }
    });
    part.on('end', async () => {
      if (part.name === 'pubkey') {
        publicKey = Buffer.concat(pubkeyBuffer);
      }

      if (part.name === 'sha256sums') {
        sha256sums = Buffer.concat(sha256sumsBuffer);
      }

      if (part.name === 'provider') {
        filename = part.filename;
        archive = Buffer.concat(archiveBuffer);
      }

      if (part.name === 'signature') {
        signature = Buffer.concat(signatureBuffer);
      }

      if (part.name === 'gpgKeyId') {
        publicKeyId = Buffer.concat(pubKeyIdBuffer).toString();
      }
    });
  });

  form.on('close', async () => {
    try {
      const exist = await hasProvider(`${destPath}/${filename}`);
      if (exist) {
        const error = new Error('Provider exist');
        error.status = 409;
        error.message = `${destPath} is already exist.`;
        return next(error);
      }

      const sha256Sum = crypto.createHash('sha256').update(archive).digest('hex');
      const fileResult = await saveProvider(`${destPath}/${filename}`, archive);
      const signatureResult = await saveProvider(`${destPath}/${filename}.sig`, signature);
      const sha256sumsResults = await saveProvider(`${destPath}/${filename}.sums`, sha256sums);

      const gpgKeys = [
        {
          keyId: publicKeyId,
          asciiArmor: publicKey.toString(),
        },
      ];

      const metaResult = await save({
        namespace,
        type,
        os,
        arch,
        sha256Sum,
        gpgKeys,
        version,
        filename,
        location: `${destPath}/${filename}`,
      });

      if (fileResult && signatureResult && metaResult && sha256sumsResults) {
        return res.status(201).render('providers/register', {
          id: destPath,
          namespace,
          type,
          filename,
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

// register a provider with version
router.post('/:namespace/:type/:version', (req, res, next) => {
  const {
    namespace,
    type,
    version,
  } = req.params;

  const destPath = `${namespace}/${type}/${version}`;

  let filename;

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

      for (let i = 0; i < files.length; i += 1) {
        const shasum = crypto.createHash('sha256').update(files[i].file).digest('hex');
        const location = `${destPath}/${files[i].filename}`;

        await saveProvider(location, files[i].file);

        if (files[i].filename.match(/\.zip$/)) {
          provider.platforms.push({
            os: fields['os[]'][i],
            arch: fields['arch[]'][i],
            location,
            filename: files[i].filename,
            shasum,
          });
        }
      }

      await save(provider);

      if (fileResult && signatureResult && metaResult && sha256sumsResults) {
        return res.status(201).render('providers/register', {
          id: destPath,
          namespace,
          type,
          filename,
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

module.exports = router;
