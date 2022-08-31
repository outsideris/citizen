module.exports = {
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
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
    'prettier/prettier': 'error',
  },
  overrides: [
    {
      files: ['**/*.spec.js'],
      env: {
        mocha: true,
      },
      plugins: ['mocha'],
      rules: {
        'mocha/no-exclusive-tests': 'error',
        'no-unused-expressions': ['off'],
      },
    },
  ],
};
