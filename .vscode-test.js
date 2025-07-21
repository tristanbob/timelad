const { defineConfig } = require("@vscode/test-cli");
const path = require("path");

module.exports = defineConfig({
  label: "integrationTests",
  files: path.normalize("test/suite/**/*.test.js"),
  version: "stable",
  workspaceFolder: path.normalize(path.resolve(__dirname, "test-fixtures")),
  mocha: {
    ui: "bdd",
    timeout: 30000,
    reporter: "spec",
  },
  launchArgs: [
    "--disable-extensions", // Disable other extensions during testing
    "--disable-workspace-trust",
    "--skip-welcome",
    "--skip-release-notes",
    "--no-sandbox", // Helps with Windows path issues
  ],
});
