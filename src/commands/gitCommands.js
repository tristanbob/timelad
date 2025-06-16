const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const GitService = require("../services/GitService");
const GitHubService = require("../services/GitHubService");
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

  /**
   * Save uncommitted changes with AI-generated commit message
   */
  async saveChanges() {
    try {
      vscode.window.showInformationMessage(constants.MESSAGES.SAVING_CHANGES);

      const commitMessage = await this.gitService.saveChanges();

      vscode.window.showInformationMessage(
        `${constants.MESSAGES.CHANGES_SAVED}\nCommit: "${commitMessage}"`
      );
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
   * Set up version tracking for the current workspace
   * Creates a new Git repository with friendly user guidance
   */
  async setupVersionTracking() {
    try {
      await this.gitService.createNewRepository();

      // Trigger a refresh of any open TimeLad views to show the new repository
      vscode.commands.executeCommand(constants.COMMANDS.REFRESH_GIT_HISTORY);
    } catch (error) {
      // Error is already handled in createNewRepository
      console.error(
        `${constants.EXTENSION_NAME}: Setup version tracking failed:`,
        error
      );
    }
  }

  /**
   * Save code to GitHub, creating repository if needed
   */
  async saveToGitHub() {
    try {
      // Get repository path
      const repoPath = await this.gitService.getRepositoryPath();

      // Check if there are any commits
      const commits = await this.gitService.getCommits(1);
      if (commits.length === 0) {
        vscode.window.showWarningMessage(
          "No commits found. Please make at least one commit before saving to GitHub."
        );
        return;
      }

      // Show progress indicator
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Saving to GitHub...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({
            increment: 10,
            message: "Checking GitHub authentication...",
          });

          // Get GitHub user info to verify authentication
          const user = await this.githubService.getUser();

          progress.report({
            increment: 20,
            message: "Getting repository information...",
          });

          // Get repository name from folder name
          const folderName = path.basename(repoPath);
          const repoName = await this.promptForRepositoryName(folderName);

          if (!repoName) {
            return; // User cancelled
          }

          progress.report({
            increment: 30,
            message: "Checking if repository exists...",
          });

          // Check if repository exists
          const repoExists = await this.githubService.repositoryExists(
            user.login,
            repoName
          );

          let repoUrl;
          if (!repoExists) {
            progress.report({
              increment: 40,
              message: "Creating GitHub repository...",
            });

            // Get repository details from user
            const repoDetails = await this.promptForRepositoryDetails(repoName);
            if (!repoDetails) {
              return; // User cancelled
            }

            // Create repository
            const createdRepo = await this.githubService.createRepository(
              repoName,
              repoDetails.description,
              repoDetails.isPrivate
            );

            repoUrl = createdRepo.clone_url;

            vscode.window.showInformationMessage(
              `✅ Repository '${repoName}' created successfully on GitHub!`
            );
          } else {
            repoUrl = `https://github.com/${user.login}/${repoName}.git`;
            vscode.window.showInformationMessage(
              `Repository '${repoName}' already exists on GitHub. Saving to existing repository.`
            );
          }

          progress.report({
            increment: 70,
            message: "Saving code to GitHub...",
          });

          // Add remote and push
          await this.githubService.addRemoteAndPush(repoPath, repoUrl);

          progress.report({ increment: 100, message: "Save completed!" });

          // Show success message with link
          const repoWebUrl = `https://github.com/${user.login}/${repoName}`;
          const viewOnGitHub = await vscode.window.showInformationMessage(
            `🎉 Successfully saved to GitHub! Your code is now online.`,
            "View on GitHub"
          );

          if (viewOnGitHub === "View on GitHub") {
            vscode.env.openExternal(vscode.Uri.parse(repoWebUrl));
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `${constants.EXTENSION_NAME}: Failed to save to GitHub: ${error.message}`
      );
    }
  }

  /**
   * Prompt user for repository name
   * @param {string} defaultName Default repository name
   * @returns {Promise<string|null>} Repository name or null if cancelled
   */
  async promptForRepositoryName(defaultName) {
    return await vscode.window.showInputBox({
      prompt: "Enter GitHub repository name",
      placeHolder: defaultName,
      value: defaultName,
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Repository name is required";
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
          return "Repository name can only contain letters, numbers, hyphens, periods, and underscores";
        }
        return null;
      },
    });
  }

  /**
   * Prompt user for repository details
   * @param {string} repoName Repository name
   * @returns {Promise<Object|null>} Repository details or null if cancelled
   */
  async promptForRepositoryDetails(repoName) {
    // Get description
    const description = await vscode.window.showInputBox({
      prompt: `Enter description for '${repoName}' (optional)`,
      placeHolder: "A brief description of your project",
      ignoreFocusOut: true,
    });

    if (description === undefined) {
      return null; // User cancelled
    }

    // Ask about privacy
    const privacy = await vscode.window.showQuickPick(
      [
        { label: "Public", description: "Anyone can see this repository" },
        { label: "Private", description: "Only you can see this repository" },
      ],
      {
        placeHolder: "Repository visibility",
        ignoreFocusOut: true,
      }
    );

    if (!privacy) {
      return null; // User cancelled
    }

    return {
      description: description || "",
      isPrivate: privacy.label === "Private",
    };
  }

  /**
   * Load a repository from GitHub by cloning it
   */
  async loadFromGitHub() {
    try {
      // Show progress indicator
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Loading from GitHub...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({
            increment: 10,
            message: "Checking GitHub authentication...",
          });

          // Get GitHub user info to verify authentication
          const user = await this.githubService.getUser();

          progress.report({
            increment: 30,
            message: "Fetching your repositories...",
          });

          // Get user's repositories
          const repositories = await this.githubService.getUserRepositories(50);

          if (repositories.length === 0) {
            vscode.window.showInformationMessage(
              "No repositories found in your GitHub account."
            );
            return;
          }

          progress.report({
            increment: 50,
            message: "Preparing repository list...",
          });

          // Let user select a repository
          const selectedRepo = await this.promptForRepositorySelection(
            repositories
          );

          if (!selectedRepo) {
            return; // User cancelled
          }

          progress.report({
            increment: 70,
            message: "Getting target folder...",
          });

          // Get target directory from user
          const targetPath = await this.promptForCloneLocation(
            selectedRepo.name
          );

          if (!targetPath) {
            return; // User cancelled
          }

          progress.report({ increment: 80, message: "Cloning repository..." });

          // Clone the repository
          await this.githubService.cloneRepository(
            selectedRepo.cloneUrl,
            targetPath
          );

          progress.report({ increment: 100, message: "Clone completed!" });

          // Ask if user wants to open the cloned repository
          const openRepo = await vscode.window.showInformationMessage(
            `🎉 Successfully loaded '${selectedRepo.name}' from GitHub!`,
            "Open Repository",
            "Open in New Window"
          );

          if (openRepo === "Open Repository") {
            // Open in current window
            await vscode.commands.executeCommand(
              "vscode.openFolder",
              vscode.Uri.file(targetPath)
            );
          } else if (openRepo === "Open in New Window") {
            // Open in new window
            await vscode.commands.executeCommand(
              "vscode.openFolder",
              vscode.Uri.file(targetPath),
              true
            );
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `${constants.EXTENSION_NAME}: Failed to load from GitHub: ${error.message}`
      );
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

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a repository to load",
      ignoreFocusOut: true,
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
    // First ask where they want to clone
    const cloneOptions = await vscode.window.showQuickPick(
      [
        {
          label: "Choose Location",
          description: "Select where to save the repository",
        },
        {
          label: "Current Workspace",
          description: "Clone into current workspace folder",
        },
      ],
      {
        placeHolder: "Where would you like to save the repository?",
        ignoreFocusOut: true,
      }
    );

    if (!cloneOptions) {
      return null; // User cancelled
    }

    let basePath;

    if (cloneOptions.label === "Current Workspace") {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          "No workspace folder is currently open."
        );
        return null;
      }
      basePath = workspaceFolders[0].uri.fsPath;
    } else {
      // Let user choose folder
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Folder",
      });

      if (!folderUri || folderUri.length === 0) {
        return null; // User cancelled
      }

      basePath = folderUri[0].fsPath;
    }

    // Combine with repository name
    const targetPath = path.join(basePath, repoName);

    // Check if folder already exists
    if (fs.existsSync(targetPath)) {
      const overwrite = await vscode.window.showWarningMessage(
        `Folder '${repoName}' already exists in the selected location. What would you like to do?`,
        "Choose Different Name",
        "Cancel"
      );

      if (overwrite === "Choose Different Name") {
        // Let user specify a different name
        const customName = await vscode.window.showInputBox({
          prompt: "Enter a different folder name",
          value: `${repoName}-clone`,
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return "Folder name is required";
            }
            const newPath = path.join(basePath, value);
            if (fs.existsSync(newPath)) {
              return "Folder already exists";
            }
            return null;
          },
        });

        if (!customName) {
          return null; // User cancelled
        }

        return path.join(basePath, customName);
      } else {
        return null; // User cancelled
      }
    }

    return targetPath;
  }
}

module.exports = GitCommands;
