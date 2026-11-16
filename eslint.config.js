const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['.expo/**', 'android/**', 'coverage/**', 'dist/**', 'node_modules/**']),
  expoConfig,
]);
