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

  // Create a disposable for the provider's internal resources
  const providerDisposable = {
    dispose: () => gitHistoryProvider.dispose(),
  };

  // Register all commands
  const commandDisposables = [
    // Refresh command for the TimeLad view
    vscode.commands.registerCommand(
      constants.COMMANDS.REFRESH_GIT_HISTORY,
      () => gitHistoryProvider.refresh()
    ),

    // Internal commands (not exposed in command palette)
    vscode.commands.registerCommand(constants.COMMANDS.SAVE_TO_GITHUB, () =>
      gitCommands.saveToGitHub()
    ),
    vscode.commands.registerCommand(constants.COMMANDS.LOAD_FROM_GITHUB, () =>
      gitCommands.loadFromGitHub()
    ),

    // Public commands (exposed in command palette)
    vscode.commands.registerCommand(
      constants.COMMANDS.RESTORE_VERSION,
      (commit, repoPath) => gitCommands.restoreVersion(commit, repoPath)
    ),
    vscode.commands.registerCommand(constants.COMMANDS.SAVE_CHANGES, () =>
      gitCommands.saveChanges()
    ),
    vscode.commands.registerCommand(
      constants.COMMANDS.SETUP_VERSION_TRACKING,
      () => gitCommands.setupVersionTracking()
    )
  ];

  // Add all disposables to context
  context.subscriptions.push(
    webviewProviderDisposable,
    providerDisposable,
    ...commandDisposables
  );

  console.log(
    `${constants.EXTENSION_NAME}: All commands and providers registered successfully`
  );

  // Schedule periodic backup cleanup (every 24 hours)
  const cleanupInterval = setInterval(async () => {
    try {
      const gitService = gitCommands.getGitService();
      if (gitService) {
        const repoPath = await gitService.getRepositoryPath().catch(() => null);
        if (repoPath) {
          console.log('Running scheduled backup cleanup...');
          await gitService.cleanupOldBackups(repoPath, constants.BACKUP.RETENTION_DAYS);
        }
      }
    } catch (error) {
      console.error('Error during scheduled backup cleanup:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Register cleanup on deactivation
  context.subscriptions.push({
    dispose: () => clearInterval(cleanupInterval)
  });
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
