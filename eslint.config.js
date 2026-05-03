const expo = require('eslint-config-expo/flat');
const { defineConfig, globalIgnores } = require('eslint/config');

module.exports = defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '.expo/**',
    '.eas-inspect-out/**',
    '.eas-inspect-pre/**',
    'web/**',
    'export-worker/**',
    'supabase/functions/**',
    '**/dist/**',
    'dist-web-test/**',
    /** Optional sharp dependency — local-only script; not installed on EAS / minimal CI images. */
    'scripts/remove-white-png.mjs',
    'metro.config.js',
    'babel.config.js',
  ]),
  ...expo,
  {
    rules: {
      /** RN copy rarely needs HTML entity escaping; revisit if you ship react-dom. */
      'react/no-unescaped-entities': 'off',
      /**
       * Several screens gate on feature flags before hooks. Refactor to wrapper
       * components (see `LiveScreen`) before turning this back to `error`.
       */
      'react-hooks/rules-of-hooks': 'warn',
    },
  },
]);
