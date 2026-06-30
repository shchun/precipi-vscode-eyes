import { defineConfig } from '@vscode/test-cli';

// Runs the Mocha suite inside a real VS Code instance downloaded by
// @vscode/test-electron. See test/*.test.js for the specs.
export default defineConfig({
  files: 'test/**/*.test.js',
  mocha: { timeout: 20000 },
});
