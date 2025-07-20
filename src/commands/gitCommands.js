const vscode = require("vscode");
const GitService = require("../services/GitService");
const GitHubService = require("../services/GitHubService");
const NotificationService = require("../services/NotificationService");
const FileOperationsService = require("../services/FileOperationsService");
const {
  getCommitHistoryTemplate,
  getCommitDetailsTemplate,
} = require("../views/templates/webviewTemplates");
const constants = require("../constants");

/**
 * Refactored Git Commands handler with separated services
 */
class GitCommands {
  constructor() {
    this.notificationService = new NotificationService();
    this.fileService = new FileOperationsService();
    
    // Create GitService with injected dependencies
    this.gitService = new GitService(
      this.notificationService,
      this.fileService
    );
    
    this.githubService = new GitHubService();
  }

  /**
   * Get the GitService instance
   * @returns {GitService} The GitService instance
   */
  getGitService() {
    return this.gitService;
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

    try {
      await this.gitService.restoreVersion(commit);
      panel.dispose();
    } catch (error) {
      throw new Error(`Failed to restore version: ${error.message}`);
    }
  }

  /**
   * Restore version command (direct call)
   * @param {Object} commit Commit object
   * @param {string} repoPath Repository path
   */
  async restoreVersion(commit, repoPath) {
    if (!commit || !repoPath) {
      await this.notificationService.showError(constants.MESSAGES.INVALID_RESTORE_PARAMS);
      return;
    }

    try {
      await this.gitService.restoreVersion(commit, repoPath);
    } catch (error) {
      await this.notificationService.showError(error.message);
    }
  }

  /**
   * Save uncommitted changes with AI-generated commit message
   */
  async saveChanges() {
    try {
      const commitMessage = await this.gitService.saveChanges();
      // Success is handled by the calling component
    } catch (error) {
      if (error.message === constants.MESSAGES.NO_UNCOMMITTED_CHANGES) {
        await this.notificationService.showInfo(error.message);
      } else {
        await this.notificationService.showError(`Failed to save changes: ${error.message}`);
      }
    }
  }

  /**
   * Set up version tracking for the current workspace
   */
  async setupVersionTracking() {
    try {
      await this.gitService.createNewRepository();
      await this.notificationService.executeCommand(constants.COMMANDS.REFRESH_GIT_HISTORY);
    } catch (error) {
      console.error(`${constants.EXTENSION_NAME}: Setup version tracking failed:`, error);
    }
  }

  /**
   * Save code to GitHub, creating repository if needed
   */
  async saveToGitHub() {
    try {
      const repoPath = await this.gitService.getRepositoryPath();

      const commits = await this.gitService.getCommits(1);
      if (commits.length === 0) {
        await this.notificationService.showWarning(
          "No commits found. Please make at least one commit before saving to GitHub."
        );
        return;
      }

      await this.notificationService.showProgress(
        "Saving to GitHub...",
        async (progress) => {
          progress.report({ increment: 10, message: "Checking GitHub authentication..." });

          const user = await this.githubService.getUser();

          progress.report({ increment: 20, message: "Getting repository information..." });

          const folderName = this.fileService.getBaseName(repoPath);
          const repoName = await this.promptForRepositoryName(folderName);

          if (!repoName) {
            return;
          }

          progress.report({ increment: 30, message: "Checking if repository exists..." });

          const repoExists = await this.githubService.repositoryExists(user.login, repoName);

          let repoUrl;
          if (!repoExists) {
            progress.report({ increment: 40, message: "Creating GitHub repository..." });

            const repoDetails = await this.promptForRepositoryDetails(repoName);
            if (!repoDetails) {
              return;
            }

            const createdRepo = await this.githubService.createRepository(
              repoName,
              repoDetails.description,
              repoDetails.isPrivate
            );

            repoUrl = createdRepo.clone_url;

            await this.notificationService.showInfo(
              `✅ Repository '${repoName}' created successfully on GitHub!`
            );
          } else {
            repoUrl = `https://github.com/${user.login}/${repoName}.git`;
            await this.notificationService.showInfo(
              `Repository '${repoName}' already exists on GitHub. Saving to existing repository.`
            );
          }

          progress.report({ increment: 70, message: "Saving code to GitHub..." });

          await this.githubService.addRemoteAndPush(repoPath, repoUrl);

          progress.report({ increment: 100, message: "Save completed!" });

          const repoWebUrl = `https://github.com/${user.login}/${repoName}`;
          await this.notificationService.showSuccess(
            `🎉 Successfully saved to GitHub! Your code is now online.`,
            "View on GitHub",
            () => this.notificationService.openExternalUrl(repoWebUrl)
          );
        }
      );
    } catch (error) {
      await this.notificationService.showError(`Failed to save to GitHub: ${error.message}`);
    }
  }

  /**
   * Prompt user for repository name
   * @param {string} defaultName Default repository name
   * @returns {Promise<string|null>} Repository name or null if cancelled
   */
  async promptForRepositoryName(defaultName) {
    return await this.notificationService.showRepositoryNameDialog(defaultName);
  }

  /**
   * Prompt user for repository details
   * @param {string} repoName Repository name
   * @returns {Promise<Object|null>} Repository details or null if cancelled
   */
  async promptForRepositoryDetails(repoName) {
    return await this.notificationService.showRepositoryDetailsDialog(repoName);
  }

  /**
   * Load a repository from GitHub by cloning it
   */
  async loadFromGitHub() {
    try {
      await this.notificationService.showProgress(
        "Loading from GitHub...",
        async (progress) => {
          progress.report({ increment: 10, message: "Checking GitHub authentication..." });

          const user = await this.githubService.getUser();

          progress.report({ increment: 30, message: "Fetching your repositories..." });

          const repositories = await this.githubService.getUserRepositories(50);

          if (repositories.length === 0) {
            await this.notificationService.showInfo(
              "No repositories found in your GitHub account."
            );
            return;
          }

          progress.report({ increment: 50, message: "Preparing repository list..." });

          const selectedRepo = await this.promptForRepositorySelection(repositories);

          if (!selectedRepo) {
            return;
          }

          progress.report({ increment: 70, message: "Getting target folder..." });

          const targetPath = await this.promptForCloneLocation(selectedRepo.name);

          if (!targetPath) {
            return;
          }

          progress.report({ increment: 80, message: "Cloning repository..." });

          await this.githubService.cloneRepository(selectedRepo.cloneUrl, targetPath);

          progress.report({ increment: 100, message: "Clone completed!" });

          const openRepo = await this.notificationService.showInfo(
            `🎉 Successfully loaded '${selectedRepo.name}' from GitHub!`,
            "Open Repository",
            "Open in New Window"
          );

          if (openRepo === "Open Repository") {
            await this.notificationService.executeCommand(
              "vscode.openFolder",
              vscode.Uri.file(targetPath)
            );
          } else if (openRepo === "Open in New Window") {
            await this.notificationService.executeCommand(
              "vscode.openFolder",
              vscode.Uri.file(targetPath),
              true
            );
          }
        }
      );
    } catch (error) {
      await this.notificationService.showError(`Failed to load from GitHub: ${error.message}`);
    }
  }

  /**
   * Prompt user to select a repository from their GitHub account
   * @param {Array} repositories Array of repository objects
   * @returns {Promise<Object|null>} Selected repository or null if cancelled
   */
  async promptForRepositorySelection(repositories) {
    const items = repositories.map((repo) => ({
      label: repo.name,
      description: repo.description,
      detail: `${repo.language || "Unknown"} • Updated: ${new Date(
        repo.updatedAt
      ).toLocaleDateString()} • ${repo.isPrivate ? "Private" : "Public"}`,
      repository: repo,
    }));

    const selected = await this.notificationService.showQuickPick(items, {
      placeHolder: "Select a repository to load",
      matchOnDescription: true,
      matchOnDetail: true,
    });

    return selected ? selected.repository : null;
  }

  /**
   * Prompt user for clone location
   * @param {string} repoName Repository name for default folder
   * @returns {Promise<string|null>} Target path or null if cancelled
   */
  async promptForCloneLocation(repoName) {
    const cloneOptions = await this.notificationService.showCloneLocationDialog();

    if (!cloneOptions) {
      return null;
    }

    let basePath;

    if (cloneOptions === "Current Workspace") {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        await this.notificationService.showError("No workspace folder is currently open.");
        return null;
      }
      basePath = workspaceFolders[0].uri.fsPath;
    } else {
      const folderUri = await this.notificationService.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Folder",
      });

      if (!folderUri || folderUri.length === 0) {
        return null;
      }

      basePath = folderUri[0].fsPath;
    }

    const targetPath = this.fileService.joinPath(basePath, repoName);

    if (this.fileService.existsSync(targetPath)) {
      const overwrite = await this.notificationService.showWarning(
        `Folder '${repoName}' already exists in the selected location. What would you like to do?`,
        {},
        "Choose Different Name",
        "Cancel"
      );

      if (overwrite === "Choose Different Name") {
        const customName = await this.notificationService.showInputBox({
          prompt: "Enter a different folder name",
          value: `${repoName}-clone`,
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return "Folder name is required";
            }
            const newPath = this.fileService.joinPath(basePath, value);
            if (this.fileService.existsSync(newPath)) {
              return "Folder already exists";
            }
            return null;
          },
        });

        if (!customName) {
          return null;
        }

        return this.fileService.joinPath(basePath, customName);
      } else {
        return null;
      }
    }

    return targetPath;
  }
}

module.exports = GitCommands;