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
  vscode.window.showInformationMessage(constants.MESSAGES.EXTENSION_ACTIVATED);

  // Initialize command handler
  const gitCommands = new GitCommands();

  // Create the webview provider for Git History view
  const gitHistoryProvider = new GitHistoryWebviewProvider(context);

  // Register webview provider
  const webviewProviderDisposable = vscode.window.registerWebviewViewProvider(
    constants.SIDEBAR_VIEW_ID,
    gitHistoryProvider
  );

  // Register all commands
  const commandDisposables = [
    // Refresh command for the Git History view
    vscode.commands.registerCommand(
      constants.COMMANDS.REFRESH_GIT_HISTORY,
      () => gitHistoryProvider.refresh()
    ),

    // Show Git Info command
    vscode.commands.registerCommand(constants.COMMANDS.SHOW_GIT_INFO, () =>
      gitCommands.showGitInfo()
    ),

    // Show Git History command (full panel)
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
