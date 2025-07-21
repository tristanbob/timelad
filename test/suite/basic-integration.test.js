/**
 * Basic integration tests to verify VS Code environment
 */

const assert = require("assert");
const vscode = require("vscode");
// Mocha functions are provided globally by VS Code test framework

describe("Basic Integration Tests", () => {
  before(async function() {
    this.timeout(30000); // Allow time for extension activation
    
    // Wait for extension to activate
    const extension = vscode.extensions.getExtension("victrisai.timelad");
    if (extension && !extension.isActive) {
      await extension.activate();
    }
  });

  it("VS Code API should be available", () => {
    assert.ok(vscode);
    assert.ok(vscode.window);
    assert.ok(vscode.workspace);
    assert.ok(vscode.commands);
  });

  it("Extension should be present", () => {
    const extension = vscode.extensions.getExtension("victrisai.timelad");
    assert.ok(extension, "Extension should be found");
  });

  it("Commands should be available", async () => {
    const commands = await vscode.commands.getCommands(true);
    
    // Check for at least one of our commands
    const hasTimeladCommand = commands.some(cmd => cmd.startsWith('timelad.'));
    assert.ok(hasTimeladCommand, "At least one TimeLad command should be registered");
  });

  it("Configuration should be accessible", () => {
    const config = vscode.workspace.getConfiguration("timelad");
    assert.ok(config !== undefined, "TimeLad configuration should be available");
  });
});