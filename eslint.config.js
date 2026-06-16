const js = require('@eslint/js');
const globals = require('globals');

// Unused vars are surfaced as warnings (incremental cleanup) and ignore the
// conventional underscore-prefixed "intentionally unused" pattern.
const unusedVars = [
  'warn',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  },
];

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'public/dist/**',
      'public/vendor/**',
      'public/crfv/back-up/**',
      'routes/_archived_unmounted/**',
    ],
  },
  js.configs.recommended,
  // Server-side (Node, CommonJS) + Jest test files.
  {
    files: [
      'app/**/*.js',
      'routes/**/*.js',
      'utils/**/*.js',
      'middleware/**/*.js',
      'scripts/**/*.js',
      'tests/**/*.js',
      'server.js',
      'supabaseClient.js',
      '*.config.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      'no-unused-vars': unusedVars,
    },
  },
  // Client-side (browser) scripts. These reference CDN-provided globals, so
  // no-undef is disabled here to avoid false positives until a browser-global
  // allowlist is curated.
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': unusedVars,
      'no-undef': 'off',
    },
  },
];
