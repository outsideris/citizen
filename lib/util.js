const { URLSearchParams } = require('url');

const makeUrl = (req, search) => {
  const params = new URLSearchParams(search);
  const searchStr = params.toString() ? `?${params.toString()}` : '';

  // eslint-disable-next-line no-underscore-dangle
  return `${req.baseUrl}${req._parsedUrl.pathname}${searchStr}`;
};

module.exports = {
  makeUrl,
};
