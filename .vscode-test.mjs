import { defineConfig } from '@vscode/test-cli';
import { resolve, normalize } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  files: normalize('test/suite/**/*.test.js'),
  workspaceFolder: normalize(resolve(__dirname, 'test-fixtures')),
  mocha: {
    ui: 'bdd',
    timeout: 30000,
    color: true
  },
  version: 'stable',
  launchArgs: [
    '--disable-extensions',
    '--disable-workspace-trust',
    '--skip-welcome',
    '--skip-release-notes',
    '--no-sandbox' // Helps with Windows path issues
  ]
});