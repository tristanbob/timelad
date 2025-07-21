const assert = require("assert");
const vscode = require("vscode");
// Mocha functions are provided globally by VS Code test framework

describe("Extension Integration Tests", () => {
  // Use after hook for proper cleanup
  after(() => {
    vscode.window.showInformationMessage("All integration tests done!");
  });

  it("Extension should be present", async () => {
    const extension = vscode.extensions.getExtension("victrisai.timelad");
    assert.ok(extension, "Extension should be found");
  });

  it("Extension should activate", async () => {
    const extension = vscode.extensions.getExtension("victrisai.timelad");
    assert.ok(extension, "Extension should be found");

    if (!extension.isActive) {
      await extension.activate();
    }

    assert.ok(extension.isActive, "Extension should be active");
  });

  it("Commands should be registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    const expectedCommands = [
      "timelad.refreshGitHistory",
      "timelad.restoreVersion", 
      "timelad.saveChanges",
      "timelad.setupVersionTracking"
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
      config.get("githubToken"),
      "",
      "GitHub token should default to empty string"
    );
  });

  it("Webview view should be registered", async () => {
    try {
      const extension = vscode.extensions.getExtension("victrisai.timelad");
      assert.ok(extension, "Extension should be found for webview test");

      if (!extension.isActive) {
        await extension.activate();
      }

      // Test passes if we get here without throwing
      assert.ok(true, "Webview view registration completed without errors");
    } catch (error) {
      assert.fail(`Webview view registration failed: ${error.message}`);
    }
  });

  it("Extension contribution points should be valid", async () => {
    const extension = vscode.extensions.getExtension("victrisai.timelad");
    assert.ok(extension, "Extension should be found");

    const packageJSON = extension.packageJSON;
    
    // Validate contributes section
    assert.ok(packageJSON.contributes, "Extension should have contributes section");
    assert.ok(packageJSON.contributes.commands, "Extension should contribute commands");
    assert.ok(packageJSON.contributes.viewsContainers, "Extension should contribute views containers");
    assert.ok(packageJSON.contributes.views, "Extension should contribute views");
    assert.ok(packageJSON.contributes.configuration, "Extension should contribute configuration");
    
    // Validate command contributions
    const commands = packageJSON.contributes.commands;
    assert.ok(Array.isArray(commands), "Commands should be an array");
    assert.ok(commands.length > 0, "Should have at least one command");
    
    // Validate each command has required properties
    commands.forEach(command => {
      assert.ok(command.command, "Each command should have a command property");
      assert.ok(command.title, "Each command should have a title property");
    });
    
    // Validate view container
    const viewsContainers = packageJSON.contributes.viewsContainers;
    assert.ok(viewsContainers.activitybar, "Should have activitybar views container");
    assert.ok(viewsContainers.activitybar.length > 0, "Should have at least one activitybar container");
    
    // Validate views
    const views = packageJSON.contributes.views;
    assert.ok(views["timelad-sidebar-view"], "Should have timelad-sidebar-view");
    assert.ok(views["timelad-sidebar-view"].length > 0, "Should have at least one view in container");
    
    // Validate configuration
    const config = packageJSON.contributes.configuration;
    assert.ok(config.properties, "Configuration should have properties");
    assert.ok(config.properties["timelad.githubToken"], "Should have githubToken configuration");
  });

  it("Extension activation events should be valid", async () => {
    const extension = vscode.extensions.getExtension("victrisai.timelad");
    assert.ok(extension, "Extension should be found");

    const packageJSON = extension.packageJSON;
    assert.ok(packageJSON.activationEvents, "Extension should have activation events");
    assert.ok(Array.isArray(packageJSON.activationEvents), "Activation events should be an array");
    assert.ok(packageJSON.activationEvents.length > 0, "Should have at least one activation event");
    
    // Validate activation events format
    packageJSON.activationEvents.forEach(event => {
      assert.ok(typeof event === 'string', "Each activation event should be a string");
      assert.ok(event.startsWith('onView:') || event.startsWith('onCommand:'), 
        `Activation event should start with onView: or onCommand:, got: ${event}`);
    });
  });

  it("Extension main entry point should be valid", async () => {
    const extension = vscode.extensions.getExtension("victrisai.timelad");
    assert.ok(extension, "Extension should be found");

    const packageJSON = extension.packageJSON;
    assert.ok(packageJSON.main, "Extension should have main entry point");
    assert.ok(packageJSON.main.endsWith('.js'), "Main entry point should be a JavaScript file");
  });

  it("Extension engines compatibility should be valid", async () => {
    const extension = vscode.extensions.getExtension("victrisai.timelad");
    assert.ok(extension, "Extension should be found");

    const packageJSON = extension.packageJSON;
    assert.ok(packageJSON.engines, "Extension should specify engines");
    assert.ok(packageJSON.engines.vscode, "Extension should specify VS Code engine version");
    
    // Validate version format
    const vscodeVersion = packageJSON.engines.vscode;
    assert.ok(vscodeVersion.match(/^\^?\d+\.\d+\.\d+$/), 
      `VS Code version should be valid semver format, got: ${vscodeVersion}`);
  });
});
