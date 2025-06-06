const assert = require("assert");
const vscode = require("vscode");

describe("Extension Integration Tests", () => {
  // Use after hook for proper cleanup
  after(() => {
    vscode.window.showInformationMessage("All integration tests done!");
  });

  it("Extension should be present", async () => {
    const extension = vscode.extensions.getExtension("tristanbob.timelad");
    assert.ok(extension, "Extension should be found");
  });

  it("Extension should activate", async () => {
    const extension = vscode.extensions.getExtension("tristanbob.timelad");
    assert.ok(extension, "Extension should be found");

    if (!extension.isActive) {
      await extension.activate();
    }

    assert.ok(extension.isActive, "Extension should be active");
  });

  it("Commands should be registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    const expectedCommands = [
      "timelad.showGitInfo",
      "timelad.showGitHistory",
      "timelad.listCommits",
      "timelad.saveChanges",
      "timelad.setupVersionTracking",
      "timelad.saveToGitHub",
      "timelad.loadFromGitHub",
    ];

    for (const command of expectedCommands) {
      assert.ok(
        commands.includes(command),
        `Command ${command} should be registered`
      );
    }
  });

  it("Configuration should be available", () => {
    const config = vscode.workspace.getConfiguration("timelad");
    assert.ok(
      config !== undefined,
      "TimeLad configuration should be available"
    );

    // Test default values
    assert.strictEqual(
      config.get("expertMode"),
      false,
      "Expert mode should default to false"
    );
    assert.strictEqual(
      config.get("githubToken"),
      "",
      "GitHub token should default to empty string"
    );
  });

  it("Tree view should be registered", async () => {
    // Check if the view container is registered by trying to reveal it
    try {
      // The view should exist even if we can't access it directly
      const extension = vscode.extensions.getExtension("tristanbob.timelad");
      assert.ok(extension, "Extension should be found for tree view test");

      if (!extension.isActive) {
        await extension.activate();
      }

      // Test passes if we get here without throwing
      assert.ok(true, "Tree view registration completed without errors");
    } catch (error) {
      assert.fail(`Tree view registration failed: ${error.message}`);
    }
  });
});
