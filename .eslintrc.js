module.exports = {
  extends: 'airbnb-base',
  env: {
    mocha: true,
  },
  plugins: [
    'mocha',
  ],
  rules: {
    'mocha/no-exclusive-tests': 'error',
    'no-unused-expressions': ['off'],
  },
};
