module.exports = {
  extends: 'airbnb-base',
  env: {
    mocha: true,
  },
  globals: {
    verbose: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: [
    'mocha',
  ],
  rules: {
    'mocha/no-exclusive-tests': 'error',
    'no-unused-expressions': ['off'],
    'import/extensions': ['error', 'ignorePackages'],
    'no-underscore-dangle': ['error', { "allow": ["__filename", "__dirname"] }],
  },
};
