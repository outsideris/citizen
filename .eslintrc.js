module.exports = {
  extends: 'airbnb-base',
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  globals: {
    verbose: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
  },
  overrides: [
    {
      files: [
        '**/*.spec.js',
      ],
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
    },
  ],
};
