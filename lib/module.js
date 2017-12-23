const globby = require('globby');
const tar = require('tar');

const makeFileList = async (target = __dirname) => {
  const filelist = await globby(['**'], {
    cwd: target,
    gitignore: true,
  });
  return filelist;
};

const makeTarball = (target = __dirname, filelist = [], writableDest) =>
  tar.create(
    {
      cwd: target,
      gzip: true,
    },
    filelist,
  ).pipe(writableDest);

module.exports = {
  makeFileList,
  makeTarball,
};
