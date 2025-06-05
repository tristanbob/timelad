const vscode = require("vscode");
const GitService = require("../services/GitService");
const {
  getCommitHistoryTemplate,
  getCommitDetailsTemplate,
} = require("../views/templates/webviewTemplates");
const constants = require("../constants");

/**
 * Git Commands handler
 */
class GitCommands {
  constructor() {
    this.gitService = new GitService();
  }

  /**
   * Show Git info command
   */
  async showGitInfo() {
    try {
      const { branch, version } = await this.gitService.getCurrentBranchInfo();

      if (!branch) {
        vscode.window.showInformationMessage(constants.MESSAGES.NOT_ON_BRANCH);
        return;
      }

      vscode.window.showInformationMessage(
        `Current Branch: ${branch}\nCurrent Version: Version ${version}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `${constants.EXTENSION_NAME}: ${error.message}`
      );
    }
  }

  /**
   * Show TimeLad history in a full panel
   */
  async showGitHistory() {
    try {
      const commits = await this.gitService.getCommits(
        constants.MAX_COMMITS_PANEL
      );

      // Create a WebView to display the commit history
      const panel = vscode.window.createWebviewPanel(
        constants.GIT_HISTORY_VIEW_ID,
        `${constants.EXTENSION_NAME}: History`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      // Set the HTML content
      panel.webview.html = getCommitHistoryTemplate(commits);

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(async (message) => {
        try {
          await this.handlePanelWebviewMessage(message, commits, panel);
        } catch (error) {
          console.error(
            `${constants.EXTENSION_NAME}: Error handling panel webview message:`,
            error
          );
          vscode.window.showErrorMessage(
            `${constants.EXTENSION_NAME}: ${error.message}`
          );
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `${constants.EXTENSION_NAME}: ${error.message}`
      );
    }
  }

  /**
   * Handle messages from the panel webview
   * @param {Object} message Message from webview
   * @param {Array} commits Array of commits
   * @param {vscode.WebviewPanel} panel The webview panel
   */
  async handlePanelWebviewMessage(message, commits, panel) {
    switch (message.command) {
      case "showCommit":
        await this.showCommitDetailsFromPanel(message.hash, commits);
        break;
      case "restoreVersion":
        await this.restoreVersionFromPanel(message.hash, commits, panel);
        break;
      default:
        console.warn(
          `${constants.EXTENSION_NAME}: Unknown panel webview message command: ${message.command}`
        );
    }
  }

  /**
   * Show commit details from panel
   * @param {string} commitHash Commit hash
   * @param {Array} commits Array of commits
   */
  async showCommitDetailsFromPanel(commitHash, commits) {
    const commit = commits.find((c) => c.hash === commitHash);
    if (!commit) {
      throw new Error("Commit not found");
    }

    const commitDetails = await this.gitService.getCommitDetails(commitHash);

    const panel = vscode.window.createWebviewPanel(
      constants.COMMIT_DETAILS_VIEW_ID,
      `${constants.EXTENSION_NAME}: Version ${commit.version}`,
      vscode.ViewColumn.One,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getCommitDetailsTemplate(commit, commitDetails);
  }

  /**
   * Restore version from panel
   * @param {string} commitHash Commit hash
   * @param {Array} commits Array of commits
   * @param {vscode.WebviewPanel} panel The webview panel
   */
  async restoreVersionFromPanel(commitHash, commits, panel) {
    const commit = commits.find((c) => c.hash === commitHash);
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
      // Close the panel after restore
      panel.dispose();
    } catch (error) {
      throw new Error(`Failed to restore version: ${error.message}`);
    }
  }

  /**
   * List commits in QuickPick
   */
  async listCommits() {
    try {
      const commits = await this.gitService.getSimpleCommits();

      // Create a QuickPick to show the commits
      const quickPick = vscode.window.createQuickPick();
      quickPick.title = "Recent Commits";
      quickPick.placeholder = "Select a commit to view details";
      quickPick.items = commits.map((commit) => ({
        label: commit.subject,
        description: `Version ${commit.version} - ${commit.author}`,
        detail: `${commit.date}`,
        commit: commit,
      }));

      quickPick.onDidAccept(async () => {
        const selectedItem = quickPick.selectedItems[0];
        if (selectedItem && selectedItem.commit) {
          const commit = selectedItem.commit;
          try {
            const commitDetails = await this.gitService.getCommitDetails(
              commit.hash
            );

            const panel = vscode.window.createWebviewPanel(
              constants.COMMIT_DETAILS_VIEW_ID,
              `${constants.EXTENSION_NAME}: Version ${commit.version}`,
              vscode.ViewColumn.One,
              {
                enableScripts: false,
                retainContextWhenHidden: true,
              }
            );

            panel.webview.html = getCommitDetailsTemplate(
              commit,
              commitDetails
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `${constants.EXTENSION_NAME}: ${error.message}`
            );
          }
        }
        quickPick.hide();
      });

      quickPick.show();
    } catch (error) {
      vscode.window.showErrorMessage(
        `${constants.EXTENSION_NAME}: ${error.message}`
      );
    }
  }

  /**
   * Restore version command (direct call)
   * @param {Object} commit Commit object
   * @param {string} repoPath Repository path
   */
  async restoreVersion(commit, repoPath) {
    if (!commit || !repoPath) {
      vscode.window.showErrorMessage(constants.MESSAGES.INVALID_RESTORE_PARAMS);
      return;
    }

    try {
      await this.gitService.restoreVersion(commit, repoPath);
    } catch (error) {
      vscode.window.showErrorMessage(
        `${constants.EXTENSION_NAME}: ${error.message}`
      );
    }
  }
}

module.exports = GitCommands;
