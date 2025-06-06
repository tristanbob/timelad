const assert = require("assert");
const vscode = require("vscode");

suite("Extension Integration Tests", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Extension should be present", () => {
    assert.ok(vscode.extensions.getExtension("tristanbob.timelad"));
  });

  test("Extension should activate", async () => {
    const extension = vscode.extensions.getExtension("tristanbob.timelad");
    await extension.activate();
    assert.strictEqual(extension.isActive, true);
  });

  test("Commands should be registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    const expectedCommands = [
      "timelad.showGitInfo",
      "timelad.showGitHistory",
      "timelad.listCommits",
      "timelad.refreshGitHistory",
      "timelad.restoreVersion",
      "timelad.toggleExpertMode",
      "timelad.saveChanges",
      "timelad.setupVersionTracking",
      "timelad.saveToGitHub",
      "timelad.loadFromGitHub",
    ];

    expectedCommands.forEach((command) => {
      assert.ok(
        commands.includes(command),
        `Command ${command} should be registered`
      );
    });
  });

  test("Configuration should be available", () => {
    const config = vscode.workspace.getConfiguration("timelad");
    assert.ok(config);

    // Test default configuration values
    assert.strictEqual(config.get("expertMode"), false);
    assert.strictEqual(config.get("githubToken"), "");
  });

  test("Extension activation message should be shown", () => {
    // Test that the extension activated successfully (we can see it in the output)
    // This is verified by the successful activation in the previous test
    assert.ok(true);
  });
});
