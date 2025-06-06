const vscode = require("vscode");
const GitHistoryWebviewProvider = require("./providers/GitHistoryWebviewProvider");
const GitCommands = require("./commands/gitCommands");
const constants = require("./constants");

/**
 * Extension activation function
 * @param {vscode.ExtensionContext} context VS Code extension context
 */
function activate(context) {
  console.log(`${constants.EXTENSION_NAME} is now active!`);

  // Alpha release warnings
  console.warn("⚠️  ALPHA RELEASE WARNING ⚠️");
  console.warn("TimeLad is an ALPHA version - use only for testing!");
  console.warn("This software may cause data loss or repository corruption.");
  console.warn("Do NOT use with important or production data.");
  console.warn("Always backup your repositories before testing.");

  // Initialize command handler
  const gitCommands = new GitCommands();

  // Create the webview provider for TimeLad view
  const gitHistoryProvider = new GitHistoryWebviewProvider(context);

  // Register webview provider
  const webviewProviderDisposable = vscode.window.registerWebviewViewProvider(
    constants.SIDEBAR_VIEW_ID,
    gitHistoryProvider
  );

  // Register all commands
  const commandDisposables = [
    // Refresh command for the TimeLad view
    vscode.commands.registerCommand(
      constants.COMMANDS.REFRESH_GIT_HISTORY,
      () => gitHistoryProvider.refresh()
    ),

    // Show Git Info command
    vscode.commands.registerCommand(constants.COMMANDS.SHOW_GIT_INFO, () =>
      gitCommands.showGitInfo()
    ),

    // Show TimeLad History command (full panel)
    vscode.commands.registerCommand(constants.COMMANDS.SHOW_GIT_HISTORY, () =>
      gitCommands.showGitHistory()
    ),

    // List Commits command (QuickPick)
    vscode.commands.registerCommand(constants.COMMANDS.LIST_COMMITS, () =>
      gitCommands.listCommits()
    ),

    // Restore Version command
    vscode.commands.registerCommand(
      constants.COMMANDS.RESTORE_VERSION,
      (commit, repoPath) => gitCommands.restoreVersion(commit, repoPath)
    ),

    // Toggle Expert Mode command
    vscode.commands.registerCommand(constants.COMMANDS.TOGGLE_EXPERT_MODE, () =>
      gitCommands.toggleExpertMode()
    ),

    // Save Changes command
    vscode.commands.registerCommand(constants.COMMANDS.SAVE_CHANGES, () =>
      gitCommands.saveChanges()
    ),

    // Set Up Version Tracking command
    vscode.commands.registerCommand(
      constants.COMMANDS.SETUP_VERSION_TRACKING,
      () => gitCommands.setupVersionTracking()
    ),

    // Save to GitHub command
    vscode.commands.registerCommand(constants.COMMANDS.SAVE_TO_GITHUB, () =>
      gitCommands.saveToGitHub()
    ),

    // Load from GitHub command
    vscode.commands.registerCommand(constants.COMMANDS.LOAD_FROM_GITHUB, () =>
      gitCommands.loadFromGitHub()
    ),
  ];

  // Add all disposables to context
  context.subscriptions.push(webviewProviderDisposable, ...commandDisposables);

  console.log(
    `${constants.EXTENSION_NAME}: All commands and providers registered successfully`
  );
}

/**
 * Extension deactivation function
 */
function deactivate() {
  console.log(`${constants.EXTENSION_NAME} extension deactivated`);
}

module.exports = {
  activate,
  deactivate,
};
