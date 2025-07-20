const vscode = require("vscode");
const GitService = require("../services/GitService");
const NotificationService = require("../services/NotificationService");
const FileOperationsService = require("../services/FileOperationsService");
const {
  getLoadingTemplate,
  getSidebarTemplate,
} = require("../views/templates/webviewTemplates");
const constants = require("../constants");

/**
 * Refactored GitHistoryWebviewProvider with separated services
 */
class GitHistoryWebviewProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
    this.commits = [];
    this.uncommittedChanges = null;
    this.isRestoring = false;

    // Initialize services
    this.notificationService = new NotificationService();
    this.fileService = new FileOperationsService();
    this.gitService = new GitService(this.notificationService, this.fileService);
    
    this.repositoryWatcher = null;

    this.setupWorkspaceListeners();
  }

  /**
   * Setup listeners for workspace changes to detect repositories faster
   */
  setupWorkspaceListeners() {
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      if (this.isRestoring) return;
      
      this.gitService.clearCache();
      if (this.view && this.view.visible) {
        this.refresh();
      }
    });

    const watcher = vscode.workspace.createFileSystemWatcher("**/.git/**");

    watcher.onDidCreate(() => {
      if (this.isRestoring) return;
      this.gitService.clearCache();
      if (this.view && this.view.visible) {
        setTimeout(() => this.refresh(), 500);
      }
    });

    watcher.onDidDelete(() => {
      if (this.isRestoring) return;
      this.gitService.clearCache();
      if (this.view && this.view.visible) {
        this.refresh();
      }
    });

    this.repositoryWatcher = watcher;
  }

  /**
   * Proactively scan for repositories
   * @returns {Promise<boolean>} True if repository found
   */
  async proactivelyScanForRepositories() {
    try {
      return await this.gitService.hasRepositoryRobust();
    } catch (error) {
      console.log(`TimeLad: Proactive scan failed: ${error.message}`);
      return false;
    }
  }

  async resolveWebviewView(webviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    this.proactivelyScanForRepositories().then((hasRepo) => {
      if (hasRepo && webviewView.visible) {
        this.refresh();
      }
    });

    await this.refresh();

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
      }
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        await this.handleWebviewMessage(message);
      } catch (error) {
        console.error(`${constants.EXTENSION_NAME}: Error handling webview message:`, error);
        await this.notificationService.showError(error.message);
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

      case "requestRestore":
        await this.requestRestore(message.hash);
        break;

      case "confirmRestore":
        await this.restoreVersion(message.hash, true);
        break;

      case "saveChanges":
        await this.saveChanges();
        break;
        
      case "requestDiscard":
        await this.requestDiscard();
        break;

      case "confirmDiscard":
        await this.discardChanges(true);
        break;
        
      case "createRepository":
        await this.createRepository();
        break;
        
      case "loadFromGitHub":
        await this.notificationService.executeCommand("timelad.loadFromGitHub");
        break;
        
      case "openUrl":
        if (message.url) {
          await this.notificationService.openExternalUrl(message.url);
        }
        break;
        
      default:
        console.warn(`${constants.EXTENSION_NAME}: Unknown webview message command: ${message.command}`);
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
   * Check for unsaved changes in the workspace
   * @returns {Promise<boolean>} True if there are unsaved changes
   */
  async hasUnsavedChanges() {
    const unsavedDocuments = vscode.workspace.textDocuments.filter(
      doc => doc.isDirty && !doc.isUntitled
    );
    return unsavedDocuments.length > 0;
  }

  /**
   * Request restore - checks for uncommitted changes and shows modal if needed
   * @param {string} commitHash Commit hash
   */
  async requestRestore(commitHash) {
    const commit = this.commits.find((c) => c.hash === commitHash);
    if (!commit) {
      await this.notificationService.showError("Commit not found");
      return;
    }

    try {
      const repoPath = await this.gitService.getRepositoryPath();
      const { hasChanges, files } = await this.gitService.getUncommittedChanges(repoPath);
      
      if (hasChanges || files.length > 0) {
        // Show custom confirmation modal in webview
        this.view.webview.postMessage({
          command: 'showConfirmation',
          title: 'Confirm Version Restore',
          message: `You have ${files.length} uncommitted change(s) that will be permanently lost.`,
          files: files.map(f => ({
            fileName: f.fileName,
            status: f.status
          })),
          commitHash: commitHash
        });
      } else {
        // No uncommitted changes, proceed directly
        await this.restoreVersion(commitHash, true);
      }
    } catch (error) {
      await this.notificationService.showError(`Error checking for changes: ${error.message}`);
    }
  }

  /**
   * Restore a specific version
   * @param {string} commitHash Commit hash
   * @param {boolean} skipConfirmation Skip confirmation checks
   */
  async restoreVersion(commitHash, skipConfirmation = false) {
    const commit = this.commits.find((c) => c.hash === commitHash);
    if (!commit) {
      throw new Error("Commit not found");
    }

    // Check for unsaved changes
    if (await this.hasUnsavedChanges()) {
      const unsavedDocuments = vscode.workspace.textDocuments.filter(
        doc => doc.isDirty && !doc.isUntitled
      );
      
      const shouldProceed = await this.notificationService.showUnsavedFilesWarning(unsavedDocuments);
      if (!shouldProceed) {
        return;
      }
    }

    // Show loading spinner
    if (this.view) {
      this.view.webview.html = this.getLoadingTemplate(`Restoring version ${commit.version}...`);
    }

    this.isRestoring = true;
    const statusBar = this.notificationService.setStatusBarMessage(constants.MESSAGES.RESTORING_VERSION);

    try {
      const result = await this.gitService.restoreVersion(commit, null, skipConfirmation);
      
      if (!result.success) {
        await this.notificationService.showError(result.message);
        return;
      }
      
      // Show success message
      if (this.view) {
        this.view.webview.html = this.getSuccessTemplate("Restore complete!");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Update commits list
      if (this.view) {
        const commits = await this.gitService.getCommits();
        this.commits = commits;
        this.view.webview.html = getSidebarTemplate(commits, this.uncommittedChanges);
      }
      
      statusBar.dispose();
    } catch (error) {
      if (this.view) {
        await this.refresh();
      }
      throw new Error(`Failed to restore version: ${error.message}`);
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Create a panel to show commit details
   * @param {Object} commit Commit object
   * @param {string} commitDetails Detailed commit information
   */
  async createCommitDetailsPanel(commit, commitDetails) {
    const { getCommitDetailsTemplate } = require("../views/templates/webviewTemplates");

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
   * Request discard - checks for uncommitted changes and shows modal
   */
  async requestDiscard() {
    try {
      const repoPath = await this.gitService.getRepositoryPath();
      const { hasChanges, files } = await this.gitService.getUncommittedChanges(repoPath);
      
      if (!hasChanges || !files || files.length === 0) {
        await this.notificationService.showInfo('No uncommitted changes to discard');
        return;
      }

      // Show custom discard confirmation modal in webview
      this.view.webview.postMessage({
        command: 'showDiscardConfirmation',
        title: 'Confirm Discard Changes',
        message: `You are about to permanently discard ${files.length} uncommitted change(s).`,
        files: files.map(f => ({
          fileName: f.fileName,
          status: f.status
        }))
      });
    } catch (error) {
      await this.notificationService.showError(`Error checking for changes: ${error.message}`);
    }
  }

  /**
   * Discard all uncommitted changes
   * @param {boolean} skipConfirmation Skip confirmation checks
   */
  async discardChanges(skipConfirmation = false) {
    try {
      const uncommittedChanges = await this.gitService.getUncommittedChanges();
      
      if (!uncommittedChanges || !uncommittedChanges.files || uncommittedChanges.files.length === 0) {
        await this.notificationService.showInfo('No uncommitted changes to discard');
        return;
      }

      if (!skipConfirmation) {
        const fileNames = uncommittedChanges.files.map(f => f.fileName);
        const shouldDiscard = await this.notificationService.showDestructiveConfirmation(
          'You have uncommitted changes that will be discarded:',
          fileNames,
          'Discard Changes',
          'Cancel'
        );

        if (!shouldDiscard) {
          return;
        }
      }

      try {
        await this.gitService.discardChanges();
        
        // Explicitly clear the local uncommitted changes state
        this.uncommittedChanges = { hasChanges: false, files: [], summary: "" };
        
        // Clear cache and refresh to ensure state is properly updated
        this.gitService.clearCache();
        await this.refresh();
        
        await this.notificationService.showInfo('All changes have been discarded');
      } catch (error) {
        await this.notificationService.showError(`Failed to discard changes: ${error.message}`);
      }
    } catch (error) {
      await this.notificationService.showError(`Error preparing to discard changes: ${error.message}`);
    }
  }

  /**
   * Save uncommitted changes
   */
  async saveChanges(options = {}) {
    if (options.discard) {
      await this.discardChanges();
      return;
    }

    // Show loading spinner
    if (this.view) {
      this.view.webview.html = this.getLoadingTemplate("Saving changes...");
    }

    try {
      const commitMessage = await this.gitService.saveChanges();

      // Show success message
      if (this.view) {
        this.view.webview.html = this.getSuccessTemplate(
          "Changes saved!",
          `"${commitMessage}"`
        );
        
        setTimeout(async () => {
          await this.refresh();
        }, 3000);
      } else {
        await this.notificationService.showInfo(
          `${constants.MESSAGES.CHANGES_SAVED}\nCommit: "${commitMessage}"`
        );
        await this.refresh();
      }
    } catch (error) {
      if (this.view) {
        await this.refresh();
      }
      
      if (error.message === constants.MESSAGES.NO_UNCOMMITTED_CHANGES) {
        await this.notificationService.showInfo(error.message);
      } else {
        await this.notificationService.showError(`Failed to save changes: ${error.message}`);
      }
    }
  }

  /**
   * Create a new repository
   */
  async createRepository() {
    try {
      this.view.webview.html = getLoadingTemplate();

      const result = await this.gitService.createNewRepository();

      if (result === null) {
        await this.refresh();
        return;
      }

      await this.refresh();
    } catch (error) {
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

    this.gitService.clearCache();
    this.view.webview.html = this.getScanningTemplate();

    try {
      const gitInstalled = await this.gitService.isGitInstalled();

      if (!gitInstalled) {
        await this.notificationService.showGitNotInstalledMessage();
        this.view.webview.html = this.getGitNotInstalledTemplate();
        return;
      }

      const hasRepo = await this.gitService.hasRepositoryRobust();

      if (!hasRepo) {
        this.view.webview.html = this.getNoRepositoryTemplate();
        return;
      }

      const [commits, uncommittedChanges] = await Promise.all([
        this.gitService.getCommits(constants.MAX_COMMITS_SIDEBAR),
        this.gitService.getUncommittedChanges(),
      ]);

      this.commits = commits;
      this.uncommittedChanges = uncommittedChanges;

      this.view.webview.html = getSidebarTemplate(this.commits, this.uncommittedChanges);
    } catch (error) {
      console.error(`${constants.EXTENSION_NAME}: Error refreshing commits:`, error);

      this.view.webview.html = this.getErrorTemplate(error.message);
    }
  }

  /**
   * Get loading template
   * @param {string} message Loading message
   * @returns {string} HTML template
   */
  getLoadingTemplate(message = "Loading...") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            text-align: center;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top-color: var(--vscode-button-background);
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .message {
            margin-top: 16px;
            color: var(--vscode-foreground);
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <div class="message">${message}</div>
      </body>
      </html>
    `;
  }

  /**
   * Get success template
   * @param {string} title Success title
   * @param {string} subtitle Optional subtitle
   * @returns {string} HTML template
   */
  getSuccessTemplate(title, subtitle = "") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            text-align: center;
          }
          .checkmark {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            display: block;
            stroke-width: 4;
            stroke: var(--vscode-testing-iconPassed);
            stroke-miterlimit: 10;
            margin: 0 auto 20px;
            box-shadow: inset 0 0 0 rgba(0, 0, 0, 0.1);
          }
          .checkmark__circle {
            stroke-dasharray: 166;
            stroke-dashoffset: 166;
            stroke-width: 2;
            stroke-miterlimit: 10;
            stroke: var(--vscode-testing-iconPassed);
            fill: none;
            animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          }
          .checkmark__check {
            transform-origin: 50% 50%;
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
          }
          @keyframes stroke {
            100% { stroke-dashoffset: 0; }
          }
          .message {
            margin-top: 16px;
            color: var(--vscode-foreground);
            font-size: 16px;
          }
          .subtitle {
            margin-top: 8px;
            font-style: italic;
            color: var(--vscode-descriptionForeground);
            max-width: 280px;
            word-wrap: break-word;
          }
          .success {
            color: var(--vscode-testing-iconPassed);
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
        <div class="message success">${title}</div>
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      </body>
      </html>
    `;
  }

  /**
   * Get error template
   * @param {string} errorMessage Error message
   * @returns {string} HTML template
   */
  getErrorTemplate(errorMessage) {
    return `
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
        <div class="error">${errorMessage}</div>
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
          </style>
      </head>
      <body>
          <div class="error-container">
              <div class="error-icon">🔧</div>
              <h1 class="error-title">Git Not Found</h1>
              <p class="error-description">
                  TimeLad needs Git to track your project's history, but Git isn't installed on your system.
              </p>
              
              <button class="action-btn" onclick="openGitWebsite()">
                  🌐 Download Git
              </button>
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
          </style>
      </head>
      <body>
          <div class="welcome-container">
              <div class="welcome-icon">🚀</div>
              <h1 class="welcome-title">Welcome to TimeLad!</h1>
              <p>This folder isn't set up for tracking your work history yet. Would you like TimeLad to set up version tracking?</p>
              
              <div style="margin-top: 25px;">
                  <button class="setup-btn" onclick="setupVersionTracking()">
                      ✨ Set Up Version Tracking
                  </button>
                  <br>
                  <button class="setup-btn" onclick="loadFromGitHub()">
                      📥 Load from GitHub
                  </button>
                  <br>
                  <button class="setup-btn" onclick="refreshView()">
                      🔄 Check Again
                  </button>
              </div>
          </div>

          <script>
              const vscode = acquireVsCodeApi();

              function setupVersionTracking() {
                  vscode.postMessage({ command: 'createRepository' });
              }

              function loadFromGitHub() {
                  vscode.postMessage({ command: 'loadFromGitHub' });
              }

              function refreshView() {
                  vscode.postMessage({ command: 'refresh' });
              }
          </script>
      </body>
      </html>
    `;
  }

  /**
   * Get template for the scanning state
   * @returns {string} HTML template
   */
  getScanningTemplate() {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TimeLad: Scanning...</title>
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
              .scanning-container {
                  max-width: 300px;
                  padding: 30px;
                  border-radius: 8px;
                  background-color: var(--vscode-editor-inactiveSelectionBackground);
                  border: 1px solid var(--vscode-panel-border);
              }
              .scanning-icon {
                  font-size: 32px;
                  margin-bottom: 20px;
                  animation: pulse 1.5s ease-in-out infinite;
              }
              .scanning-title {
                  font-size: 1.1em;
                  color: var(--vscode-terminal-ansiBlue);
                  margin: 0 0 10px 0;
                  font-weight: 500;
              }
              .scanning-description {
                  color: var(--vscode-descriptionForeground);
                  line-height: 1.4;
                  margin-bottom: 20px;
                  font-size: 0.9em;
              }
              .progress-bar {
                  width: 100%;
                  height: 3px;
                  background-color: var(--vscode-progressBar-background);
                  border-radius: 2px;
                  overflow: hidden;
                  margin-top: 15px;
              }
              .progress-fill {
                  height: 100%;
                  background-color: var(--vscode-terminal-ansiBlue);
                  animation: progress 2s ease-in-out infinite;
              }
              @keyframes pulse {
                  0%, 100% { transform: scale(1); opacity: 0.7; }
                  50% { transform: scale(1.1); opacity: 1; }
              }
              @keyframes progress {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
              }
          </style>
      </head>
      <body>
          <div class="scanning-container">
              <div class="scanning-icon">🔍</div>
              <h2 class="scanning-title">Scanning folder...</h2>
              <p class="scanning-description">
                  Looking for git repositories in your workspace
              </p>
              <div class="progress-bar">
                  <div class="progress-fill"></div>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    if (this.repositoryWatcher) {
      this.repositoryWatcher.dispose();
      this.repositoryWatcher = null;
    }
  }
}

module.exports = GitHistoryWebviewProvider;