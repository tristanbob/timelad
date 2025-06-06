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

    // Refresh when the view becomes visible (user clicks on extension)
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
      }
    });

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
      case "createRepository":
        await this.createRepository();
        break;
      case "loadFromGitHub":
        // Execute the Load from GitHub command
        vscode.commands.executeCommand("timelad.loadFromGitHub");
        break;
      case "openUrl":
        if (message.url) {
          await vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
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
   * Create a new repository
   */
  async createRepository() {
    try {
      // Show loading state while creating repository
      this.view.webview.html = getLoadingTemplate();

      // Create the repository
      const result = await this.gitService.createNewRepository();

      if (result === null) {
        // User cancelled or chose to load from GitHub
        // Just refresh to show the original state
        await this.refresh();
        return;
      }

      // Refresh the view to show the new repository
      await this.refresh();
    } catch (error) {
      // Error is already handled in createNewRepository
      // Refresh to show the error state or original content
      await this.refresh();
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
      // First check if git is installed
      const gitInstalled = await this.gitService.isGitInstalled();

      if (!gitInstalled) {
        // Show git installation message and return
        await this.gitService.showGitNotInstalledMessage();
        this.view.webview.html = this.getGitNotInstalledTemplate();
        return;
      }

      // Check if repository exists
      const hasRepo = await this.gitService.hasRepository();

      if (!hasRepo) {
        // Show the repository setup UI
        this.view.webview.html = this.getNoRepositoryTemplate();
        return;
      }

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

  /**
   * Get template for when git is not installed
   * @returns {string} HTML template
   */
  getGitNotInstalledTemplate() {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TimeLad: Git Required</title>
          <style>
              body {
                  font-family: var(--vscode-font-family);
                  padding: 20px;
                  color: var(--vscode-foreground);
                  background-color: var(--vscode-editor-background);
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  flex-direction: column;
                  text-align: center;
              }
              .error-container {
                  max-width: 400px;
                  padding: 30px;
                  border-radius: 8px;
                  background-color: var(--vscode-inputValidation-errorBackground);
                  border: 1px solid var(--vscode-inputValidation-errorBorder);
              }
              .error-icon {
                  font-size: 48px;
                  margin-bottom: 20px;
                  color: var(--vscode-errorForeground);
              }
              .error-title {
                  font-size: 1.4em;
                  color: var(--vscode-errorForeground);
                  margin: 0 0 15px 0;
                  font-weight: 600;
              }
              .error-description {
                  color: var(--vscode-foreground);
                  line-height: 1.6;
                  margin-bottom: 25px;
                  font-size: 0.95em;
              }
              .install-steps {
                  text-align: left;
                  margin: 20px 0;
                  background-color: var(--vscode-editor-background);
                  padding: 15px;
                  border-radius: 4px;
                  border: 1px solid var(--vscode-panel-border);
              }
              .install-steps h4 {
                  margin: 0 0 10px 0;
                  color: var(--vscode-terminal-ansiBlue);
              }
              .install-steps ul {
                  margin: 0;
                  padding-left: 20px;
              }
              .install-steps li {
                  margin-bottom: 5px;
                  font-size: 0.9em;
              }
              .action-btn {
                  background: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  border-radius: 4px;
                  padding: 12px 24px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                  margin: 8px;
                  transition: all 0.2s ease;
              }
              .action-btn:hover {
                  background: var(--vscode-button-hoverBackground);
              }
              .refresh-note {
                  margin-top: 20px;
                  padding: 10px;
                  background-color: var(--vscode-textBlockQuote-background);
                  border-left: 3px solid var(--vscode-terminal-ansiYellow);
                  border-radius: 3px;
                  font-size: 0.85em;
                  text-align: left;
              }
          </style>
      </head>
      <body>
          <div class="error-container">
              <div class="error-icon">🔧</div>
              <h1 class="error-title">Git Not Found</h1>
              <p class="error-description">
                  TimeLad needs Git to track your project's history, but Git isn't installed on your system.
              </p>
              
              <div class="install-steps">
                  <h4>📦 Installation Steps:</h4>
                  <ul>
                      <li><strong>Windows:</strong> Download from git-scm.com</li>
                      <li><strong>Mac:</strong> Install Xcode Command Line Tools</li>
                      <li><strong>Linux:</strong> Use your package manager</li>
                  </ul>
              </div>
              
              <button class="action-btn" onclick="openGitWebsite()">
                  🌐 Download Git
              </button>
              
              <div class="refresh-note">
                  <strong>💡 After installing:</strong> Please restart VS Code, then refresh this view.
              </div>
          </div>
          
          <script>
              const vscode = acquireVsCodeApi();
              
              function openGitWebsite() {
                  vscode.postMessage({ command: 'openUrl', url: 'https://git-scm.com/downloads' });
              }
          </script>
      </body>
      </html>
    `;
  }

  /**
   * Get template for when no repository exists
   * @returns {string} HTML template
   */
  getNoRepositoryTemplate() {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TimeLad: Get Started</title>
          <style>
              body {
                  font-family: var(--vscode-font-family);
                  padding: 20px;
                  color: var(--vscode-foreground);
                  background-color: var(--vscode-editor-background);
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  flex-direction: column;
                  text-align: center;
              }
              .welcome-container {
                  max-width: 350px;
                  padding: 25px;
                  border-radius: 8px;
                  background-color: var(--vscode-editor-inactiveSelectionBackground);
                  border: 1px solid var(--vscode-panel-border);
              }
              .welcome-icon {
                  font-size: 40px;
                  margin-bottom: 15px;
              }
              .welcome-title {
                  font-size: 1.3em;
                  color: var(--vscode-terminal-ansiGreen);
                  margin: 0 0 12px 0;
                  font-weight: 600;
              }
              .welcome-description {
                  color: var(--vscode-descriptionForeground);
                  line-height: 1.5;
                  margin-bottom: 20px;
                  font-size: 0.9em;
              }
              .benefits-list {
                  text-align: left;
                  margin: 15px 0;
                  color: var(--vscode-editor-foreground);
                  font-size: 0.85em;
              }
              .benefits-list li {
                  margin-bottom: 6px;
                  padding-left: 3px;
              }
              .setup-btn {
                  background: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  border-radius: 4px;
                  padding: 10px 20px;
                  cursor: pointer;
                  font-size: 13px;
                  font-weight: 500;
                  margin: 8px 3px;
                  transition: all 0.2s ease;
                  min-width: 140px;
              }
              .setup-btn:hover {
                  background: var(--vscode-button-hoverBackground);
                  transform: translateY(-1px);
              }
              .setup-btn.secondary {
                  background: var(--vscode-button-secondaryBackground);
                  color: var(--vscode-button-secondaryForeground);
                  border: 1px solid var(--vscode-button-border);
              }
              .setup-btn.secondary:hover {
                  background: var(--vscode-button-secondaryHoverBackground);
              }
              .analogy {
                  background-color: var(--vscode-textBlockQuote-background);
                  border-left: 3px solid var(--vscode-terminal-ansiBlue);
                  padding: 12px;
                  margin: 15px 0;
                  border-radius: 3px;
                  font-style: italic;
                  color: var(--vscode-editor-foreground);
                  font-size: 0.85em;
              }
          </style>
      </head>
      <body>
          <div class="welcome-container">
              <div class="welcome-icon">🚀</div>
              <h1 class="welcome-title">Welcome to TimeLad!</h1>
              <p class="welcome-description">
                  This folder isn't set up for tracking your work history yet. Would you like TimeLad to set up version tracking?
              </p>
              
              <div class="analogy">
                  💡 Think of it like having an automatic "Save Game" feature for your code!
              </div>
              
              <p class="welcome-description" style="font-weight: 500; margin-bottom: 8px;">
                  Version tracking will help you:
              </p>
              
              <ul class="benefits-list">
                  <li>🛡️ Keep track of all your changes</li>
                  <li>⏰ Go back to previous versions if something goes wrong</li>
                  <li>📈 See the timeline of your work</li>
                  <li>🎯 Never lose your progress again</li>
              </ul>
              
              <div style="margin-top: 25px;">
                  <button class="setup-btn" onclick="setupVersionTracking()">
                      ✨ Set Up Version Tracking
                  </button>
                  <br>
                  <button class="setup-btn" onclick="loadFromGitHub()" style="background: var(--vscode-terminal-ansiBlue); margin-top: 8px;">
                      📥 Load from GitHub
                  </button>
                  <br>
                  <button class="setup-btn secondary" onclick="refreshView()">
                      🔄 Check Again
                  </button>
              </div>
          </div>

          <script>
              const vscode = acquireVsCodeApi();

              function setupVersionTracking() {
                  vscode.postMessage({
                      command: 'createRepository'
                  });
              }

              function loadFromGitHub() {
                  vscode.postMessage({
                      command: 'loadFromGitHub'
                  });
              }

              function refreshView() {
                  vscode.postMessage({
                      command: 'refresh'
                  });
              }
          </script>
      </body>
      </html>
    `;
  }
}

module.exports = GitHistoryWebviewProvider;
