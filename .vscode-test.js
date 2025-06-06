const { defineConfig } = require("@vscode/test-cli");

module.exports = defineConfig({
  label: "integrationTests",
  files: "test/suite/**/*.test.js",
  version: "stable",
  workspaceFolder: "./test-fixtures",
  mocha: {
    ui: "bdd",
    timeout: 30000,
    reporter: "spec",
  },
  launchArgs: [
    "--disable-extensions", // Disable other extensions during testing
  ],
});
