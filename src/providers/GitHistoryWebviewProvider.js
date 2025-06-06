const vscode = require("vscode");
const GitService = require("../services/GitService");
const {
  getLoadingTemplate,
  getSidebarTemplate,
} = require("../views/templates/webviewTemplates");
const constants = require("../constants");

/**
 * GitHistoryWebviewProvider manages the webview for the sidebar
 */
class GitHistoryWebviewProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
    this.commits = [];
    this.uncommittedChanges = null;
    this.gitService = new GitService();
  }

  async resolveWebviewView(webviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    // Load initial content
    await this.refresh();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        await this.handleWebviewMessage(message);
      } catch (error) {
        console.error(
          `${constants.EXTENSION_NAME}: Error handling webview message:`,
          error
        );
        vscode.window.showErrorMessage(
          `${constants.EXTENSION_NAME}: ${error.message}`
        );
      }
    });
  }

  /**
   * Handle messages from the webview
   * @param {Object} message Message from webview
   */
  async handleWebviewMessage(message) {
    switch (message.command) {
      case "showCommit":
        await this.showCommitDetails(message.hash);
        break;
      case "refresh":
        await this.refresh();
        break;
      case "restoreVersion":
        await this.restoreVersion(message.hash);
        break;
      case "toggleExpertMode":
        await this.toggleExpertMode();
        break;
      case "saveChanges":
        await this.saveChanges();
        break;
      default:
        console.warn(
          `${constants.EXTENSION_NAME}: Unknown webview message command: ${message.command}`
        );
    }
  }

  /**
   * Show commit details for a specific commit
   * @param {string} commitHash Commit hash
   */
  async showCommitDetails(commitHash) {
    const commit = this.commits.find((c) => c.hash === commitHash);
    if (!commit) {
      throw new Error("Commit not found");
    }

    const commitDetails = await this.gitService.getCommitDetails(commitHash);
    await this.createCommitDetailsPanel(commit, commitDetails);
  }

  /**
   * Restore a specific version
   * @param {string} commitHash Commit hash
   */
  async restoreVersion(commitHash) {
    const commit = this.commits.find((c) => c.hash === commitHash);
    if (!commit) {
      throw new Error("Commit not found");
    }

    // Show confirmation dialog first
    const confirmRestore = await vscode.window.showInformationMessage(
      `Are you sure you want to restore to Version ${commit.version}?\n\nThis will create a new commit with the state of Version ${commit.version}, preserving all existing history.`,
      { modal: true },
      "Restore Version",
      "Cancel"
    );

    if (confirmRestore !== "Restore Version") {
      return;
    }

    vscode.window.showInformationMessage(constants.MESSAGES.RESTORING_VERSION);

    try {
      await this.gitService.restoreVersion(commit);
      // Refresh the view after restore
      await this.refresh();
    } catch (error) {
      throw new Error(`Failed to restore version: ${error.message}`);
    }
  }

  /**
   * Create a panel to show commit details
   * @param {Object} commit Commit object
   * @param {string} commitDetails Detailed commit information
   */
  async createCommitDetailsPanel(commit, commitDetails) {
    const {
      getCommitDetailsTemplate,
    } = require("../views/templates/webviewTemplates");

    const panel = vscode.window.createWebviewPanel(
      constants.COMMIT_DETAILS_VIEW_ID,
      `${constants.EXTENSION_NAME}: Version ${commit.version}`,
      vscode.ViewColumn.One,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
      }
    );

    // Check if expert mode is enabled
    const config = vscode.workspace.getConfiguration("timelad");
    const expertMode = config.get("expertMode", false);

    panel.webview.html = getCommitDetailsTemplate(
      commit,
      commitDetails,
      expertMode
    );
  }

  /**
   * Toggle expert mode setting
   */
  async toggleExpertMode() {
    try {
      const config = vscode.workspace.getConfiguration("timelad");
      const currentMode = config.get("expertMode", false);
      const newMode = !currentMode;

      await config.update(
        "expertMode",
        newMode,
        vscode.ConfigurationTarget.Global
      );

      // Refresh the view to show the new mode
      await this.refresh();

      const modeText = newMode ? "enabled" : "disabled";
      vscode.window.showInformationMessage(
        `${constants.EXTENSION_NAME}: Expert mode ${modeText}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `${constants.EXTENSION_NAME}: Failed to toggle expert mode: ${error.message}`
      );
    }
  }

  /**
   * Save uncommitted changes
   */
  async saveChanges() {
    try {
      vscode.window.showInformationMessage(constants.MESSAGES.SAVING_CHANGES);

      const commitMessage = await this.gitService.saveChanges();

      vscode.window.showInformationMessage(
        `${constants.MESSAGES.CHANGES_SAVED}\nCommit: "${commitMessage}"`
      );

      // Refresh the view after saving
      await this.refresh();
    } catch (error) {
      if (error.message === constants.MESSAGES.NO_UNCOMMITTED_CHANGES) {
        vscode.window.showInformationMessage(error.message);
      } else {
        vscode.window.showErrorMessage(
          `${constants.EXTENSION_NAME}: Failed to save changes: ${error.message}`
        );
      }
    }
  }

  /**
   * Refresh the webview content
   */
  async refresh() {
    if (!this.view) {
      return;
    }

    // Clear cache on manual refresh
    this.gitService.clearCache();

    // Show loading state
    this.view.webview.html = getLoadingTemplate();

    try {
      // Fetch commits and uncommitted changes
      const [commits, uncommittedChanges] = await Promise.all([
        this.gitService.getCommits(constants.MAX_COMMITS_SIDEBAR),
        this.gitService.getUncommittedChanges(),
      ]);

      this.commits = commits;
      this.uncommittedChanges = uncommittedChanges;

      // Check if expert mode is enabled
      const config = vscode.workspace.getConfiguration("timelad");
      const expertMode = config.get("expertMode", false);

      // Update webview with commit data and uncommitted changes
      this.view.webview.html = getSidebarTemplate(
        this.commits,
        expertMode,
        this.uncommittedChanges
      );
    } catch (error) {
      console.error(
        `${constants.EXTENSION_NAME}: Error refreshing commits:`,
        error
      );

      // Show error state
      this.view.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    text-align: center;
                }
                .error {
                    color: var(--vscode-errorForeground);
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                }
                .retry-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    padding: 8px 16px;
                    cursor: pointer;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
                            <h2>⚠️ Error Loading History</h2>
            <div class="error">
                ${error.message}
            </div>
            <button class="retry-btn" onclick="refreshHistory()">🔄 Try Again</button>
            <script>
                const vscode = acquireVsCodeApi();
                function refreshHistory() {
                    vscode.postMessage({ command: 'refresh' });
                }
            </script>
        </body>
        </html>
      `;
    }
  }
}

module.exports = GitHistoryWebviewProvider;
