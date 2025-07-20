const { exec } = require('child_process');
const util = require('util');
const vscode = require("vscode");
const { promisify } = util;
const constants = require("../constants");
const AICommitMessageService = require("./AICommitMessageService");
const NotificationService = require("./NotificationService");
const FileOperationsService = require("./FileOperationsService");

const execPromise = promisify(exec);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Refactored GitService with separated concerns
 * Focuses purely on Git operations, delegating other responsibilities
 */
class GitService {
  constructor(notificationService = null, fileService = null, aiService = null) {
    // Dependency injection for services
    this.notificationService = notificationService || new NotificationService();
    this.fileService = fileService || new FileOperationsService();
    this.aiService = aiService || new AICommitMessageService();
    
    // Core Git service state
    this.cache = new Map();
    this.repositoryScanCache = new Map();
    this.lastHealthCheck = new Map();
  }

  /**
   * Get Git extension safely
   * @returns {Object|null} Git extension API or null
   */
  getGitExtension() {
    const extension = vscode.extensions.getExtension(constants.GIT_EXTENSION_ID);
    return extension ? extension.exports : null;
  }

  /**
   * Check if git is installed on the system
   * @returns {Promise<boolean>} True if git is installed
   */
  async isGitInstalled() {
    try {
      await this.executeGitCommand("git --version", ".");
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for Git extension to be ready
   * @param {number} maxAttempts Maximum number of attempts
   * @returns {Promise<boolean>} True if Git is ready, false if max attempts reached
   */
  async waitForGitReady(maxAttempts = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const gitExtension = this.getGitExtension();

        if (gitExtension) {
          const api = gitExtension.getAPI(1);
          if (api && Array.isArray(api.repositories)) {
            return true;
          }
        }
      } catch (error) {
        // Git extension might not be ready yet, continue
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * Check if a directory is a Git repository
   * @param {string} dirPath Directory path to check
   * @returns {Promise<boolean>} True if directory is a Git repository
   */
  async isGitRepository(dirPath) {
    try {
      await this.executeGitCommand("git rev-parse --git-dir", dirPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Scan workspace folders for git repositories
   * @param {number} maxDepth Maximum depth to scan (default: 3)
   * @returns {Promise<Array<string>>} Array of repository paths found
   */
  async scanForRepositories(maxDepth = 3) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    const repositories = [];
    const scanPromises = workspaceFolders.map((folder) =>
      this.scanFolderForGit(folder.uri.fsPath, maxDepth)
    );

    try {
      const results = await Promise.all(scanPromises);
      results.forEach((folderRepos) => {
        repositories.push(...folderRepos);
      });
    } catch (error) {
      console.log(`TimeLad: Error scanning for repositories: ${error.message}`);
    }

    return repositories;
  }

  /**
   * Recursively scan a folder for git repositories
   * @param {string} folderPath Path to scan
   * @param {number} maxDepth Maximum depth to scan
   * @param {number} currentDepth Current depth in recursion
   * @returns {Promise<Array<string>>} Array of repository paths found
   */
  async scanFolderForGit(folderPath, maxDepth, currentDepth = 0) {
    const repositories = [];

    try {
      if (await this.isGitRepository(folderPath)) {
        repositories.push(folderPath);
        return repositories;
      }

      if (currentDepth < maxDepth) {
        try {
          const entries = await this.fileService.readDirectoryWithTypes(folderPath);
          const subdirPromises = entries
            .filter(
              (entry) =>
                entry.isDirectory() &&
                !entry.name.startsWith(".") &&
                entry.name !== "node_modules" &&
                entry.name !== "dist" &&
                entry.name !== "build"
            )
            .map((entry) =>
              this.scanFolderForGit(
                this.fileService.joinPath(folderPath, entry.name),
                maxDepth,
                currentDepth + 1
              )
            );

          const subdirResults = await Promise.all(subdirPromises);
          subdirResults.forEach((subdirRepos) => {
            repositories.push(...subdirRepos);
          });
        } catch (error) {
          // Ignore errors reading directory
        }
      }
    } catch (error) {
      // Ignore errors for individual folders
    }

    return repositories;
  }

  /**
   * Get the primary repository path from workspace
   * @returns {Promise<string>} Repository path
   * @throws {Error} If no repository found
   */
  async getRepositoryPathRobust() {
    const cacheKey = "primary-repo-path";
    const cached = this.repositoryScanCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5000) {
      if (cached.error) {
        throw new Error(cached.error);
      }
      return cached.data;
    }

    let repositoryPath = null;
    let lastError = null;

    try {
      // Method 1: Scan file system directly
      const repositories = await this.scanForRepositories(2);
      if (repositories.length > 0) {
        repositoryPath = repositories[0];
        this.repositoryScanCache.set(cacheKey, {
          data: repositoryPath,
          timestamp: Date.now(),
          error: null,
        });
        return repositoryPath;
      }
    } catch (error) {
      lastError = error;
    }

    // Method 2: Try Git extension
    try {
      if (await this.isGitInstalled()) {
        const gitReady = await this.waitForGitReady(5);

        if (gitReady) {
          const gitExtension = this.getGitExtension();
          if (gitExtension) {
            const api = gitExtension.getAPI(1);
            if (api && api.repositories && api.repositories.length > 0) {
              repositoryPath = api.repositories[0].rootUri.fsPath;
              this.repositoryScanCache.set(cacheKey, {
                data: repositoryPath,
                timestamp: Date.now(),
                error: null,
              });
              return repositoryPath;
            }
          }
        }
      }
    } catch (error) {
      lastError = error;
    }

    // Method 3: Try git command directly on workspace folder
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const workspacePath = workspaceFolders[0].uri.fsPath;
        await this.executeGitCommand("git rev-parse --git-dir", workspacePath);

        repositoryPath = workspacePath;
        this.repositoryScanCache.set(cacheKey, {
          data: repositoryPath,
          timestamp: Date.now(),
          error: null,
        });
        return repositoryPath;
      }
    } catch (error) {
      lastError = error;
    }

    // No repository found
    const errorMessage = lastError ? lastError.message : constants.ERRORS.NO_REPOSITORIES;
    this.repositoryScanCache.set(cacheKey, {
      data: null,
      timestamp: Date.now(),
      error: errorMessage,
    });

    throw new Error(errorMessage);
  }

  /**
   * Enhanced repository detection
   * @returns {Promise<boolean>} True if repository exists
   */
  async hasRepositoryRobust() {
    try {
      if (!(await this.isGitInstalled())) {
        console.log("TimeLad: Git is not installed on this system");
        return false;
      }

      await this.getRepositoryPathRobust();
      return true;
    } catch (error) {
      console.log(`TimeLad: No repository found - ${error.message}`);
      return false;
    }
  }

  /**
   * Get repository path safely
   * @returns {Promise<string>} Repository path
   */
  async getRepositoryPath() {
    return this.getRepositoryPathRobust();
  }

  /**
   * Execute a Git command with retry logic
   * @param {string} command Git command to execute
   * @param {string} repoPath Repository path
   * @param {number} maxRetries Maximum number of retry attempts
   * @param {number} retryDelay Delay between retries in ms
   * @param {Object} envVars Additional environment variables
   * @returns {Promise<{stdout: string, stderr: string}>} Command result
   */
  async executeGitCommand(command, repoPath, maxRetries = 2, retryDelay = 100, envVars = {}) {
    const options = { 
      cwd: repoPath,
      env: { ...process.env, ...envVars }
    };
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { stdout, stderr } = await execPromise(command, options);
        if (stderr && !stderr.includes('warning: ')) {
          console.warn(`Git stderr: ${stderr}`);
        }
        return { 
          stdout: stdout ? stdout.trim() : '', 
          stderr: stderr ? stderr.trim() : '' 
        };
      } catch (error) {
        lastError = error;
        
        if (error.message && error.message.includes('index.lock') && attempt < maxRetries) {
          console.warn(`Git lock conflict (attempt ${attempt + 1}/${maxRetries}), retrying...`);
          await this.fileService.removeGitLockFile(repoPath);
          await delay(retryDelay * (attempt + 1));
          continue;
        }
        
        break;
      }
    }
    
    const errorMessage = lastError ? 
      `Error executing git command after ${maxRetries + 1} attempts: ${command}\n${lastError.message || lastError}` :
      `Unknown error executing git command: ${command}`;
      
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Get total number of commits in repository
   * @param {string} repoPath Repository path
   * @returns {Promise<number>} Total commit count
   */
  async getCommitCount(repoPath) {
    const { stdout } = await this.executeGitCommand(
      constants.GIT_COMMANDS.COUNT_COMMITS,
      repoPath
    );
    return parseInt(stdout.trim());
  }

  /**
   * Internal method to fetch commits with flexible options
   * @param {Object} options Options for commit retrieval
   * @returns {Promise<Array>} Array of commit objects
   */
  async _getCommitsInternal({
    limit = constants.MAX_COMMITS_SIDEBAR,
    repoPath = null,
    useCache = true,
    logFormat = constants.GIT_COMMANDS.LOG_FORMAT,
  } = {}) {
    if (!repoPath) {
      repoPath = await this.getRepositoryPath();
    }

    const cacheKey = `commits-${repoPath}-${limit}-${logFormat.includes('LOG_FORMAT') ? 'detail' : 'simple'}`;
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < constants.CACHE_TIMEOUT) {
        return cached.data;
      }
    }

    const totalCommits = await this.getCommitCount(repoPath);
    const command = logFormat.replace("%d", limit);
    const { stdout } = await this.executeGitCommand(command, repoPath);

    const commits = stdout
      .split("\n")
      .map((line, index) => {
        if (!line.trim()) return null;
        const [hash, author, date, subject] = line.split("|");
        const versionNumber = totalCommits - index;
        return {
          hash: hash || "",
          author: author || "Unknown",
          date: date || "",
          subject: subject || "No subject",
          version: versionNumber,
        };
      })
      .filter((commit) => commit !== null);

    if (useCache) {
      this.cache.set(cacheKey, {
        data: commits,
        timestamp: Date.now(),
      });
    }

    return commits;
  }

  /**
   * Get commits with version numbers
   * @param {number} limit Maximum number of commits to fetch
   * @param {string} repoPath Repository path
   * @returns {Promise<Array>} Array of commit objects
   */
  async getCommits(limit = constants.MAX_COMMITS_SIDEBAR, repoPath = null) {
    try {
      return await this._getCommitsInternal({
        limit,
        repoPath,
        useCache: true,
        logFormat: constants.GIT_COMMANDS.LOG_FORMAT,
      });
    } catch (error) {
      throw new Error(`${constants.ERRORS.FETCH_COMMITS_FAILED}: ${error.message}`);
    }
  }

  /**
   * Get simple commits for QuickPick
   * @param {string} repoPath Repository path
   * @returns {Promise<Array>} Array of commit objects
   */
  async getSimpleCommits(repoPath = null) {
    return this._getCommitsInternal({
      limit: constants.MAX_COMMITS_QUICKPICK,
      repoPath,
      useCache: false,
      logFormat: constants.GIT_COMMANDS.LOG_SIMPLE,
    });
  }

  /**
   * Get current branch information
   * @returns {Promise<{branch: string, version: number}>} Current branch and version
   */
  async getCurrentBranchInfo() {
    const repoPath = await this.getRepositoryPath();
    const gitExtension = this.getGitExtension();
    const api = gitExtension.getAPI(1);
    const repo = api.repositories[0];
    const head = repo.state.HEAD;

    if (!head) {
      return { branch: null, version: null };
    }

    const branch = head.name;
    const version = await this.getCommitCount(repoPath);

    return { branch, version };
  }

  /**
   * Get detailed commit information
   * @param {string} commitHash Commit hash
   * @param {string} repoPath Repository path
   * @returns {Promise<string>} Detailed commit information
   */
  async getCommitDetails(commitHash, repoPath = null) {
    if (!repoPath) {
      repoPath = await this.getRepositoryPath();
    }

    const command = constants.GIT_COMMANDS.SHOW_COMMIT.replace("%s", commitHash);
    const { stdout } = await this.executeGitCommand(command, repoPath);
    return stdout;
  }

  /**
   * Check if working directory is clean
   * @param {string} repoPath Repository path
   * @returns {Promise<boolean>} True if working directory is clean
   */
  async isWorkingDirectoryClean(repoPath) {
    const { stdout } = await this.executeGitCommand(
      constants.GIT_COMMANDS.STATUS_PORCELAIN,
      repoPath
    );
    return !stdout.trim();
  }

  /**
   * Stash current changes
   * @param {string} repoPath Repository path
   */
  async stashChanges(repoPath) {
    await this.executeGitCommand(constants.GIT_COMMANDS.STASH_PUSH, repoPath);
  }

  /**
   * Get current branch name
   * @param {string} repoPath Path to repository
   * @returns {Promise<string>} Current branch name
   */
  async getCurrentBranchName(repoPath) {
    const { stdout } = await this.executeGitCommand('git rev-parse --abbrev-ref HEAD', repoPath);
    return stdout.trim();
  }

  /**
   * Create a backup branch before destructive operations
   * @param {string} repoPath Path to repository
   * @returns {Promise<string>} Name of the backup branch
   */
  async createBackupBranch(repoPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `timelad/backup/pre-restore-${timestamp}`;
    const currentBranch = await this.getCurrentBranchName(repoPath);
    
    await this.executeGitCommand(`git checkout -b ${branchName}`, repoPath);
    await this.executeGitCommand(`git checkout ${currentBranch}`, repoPath);
    
    return branchName;
  }

  /**
   * Clean up old backup branches
   * @param {string} repoPath Path to repository
   * @param {number} daysToKeep Number of days to keep backups
   */
  async cleanupOldBackups(repoPath, daysToKeep = 7) {
    try {
      const { stdout } = await this.executeGitCommand(
        'git for-each-ref --format="%(refname:short) %(creatordate:iso)" refs/heads/timelad/backup/',
        repoPath
      );

      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - daysToKeep);

      for (const line of stdout.trim().split('\n')) {
        if (!line) continue;
        
        const [branch, ...dateParts] = line.split(' ');
        const dateStr = dateParts.join(' ');
        const branchDate = new Date(dateStr);

        if (branchDate < cutoff) {
          try {
            await this.executeGitCommand(`git branch -D ${branch}`, repoPath);
          } catch (error) {
            console.warn(`Failed to delete old backup branch ${branch}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Error during backup cleanup:', error);
    }
  }

  /**
   * Create a new commit that restores the working directory to a specific commit
   * @param {string} commitHash Commit hash to restore
   * @param {string} repoPath Repository path
   * @returns {Promise<string>} The new commit hash
   */
  async createRestoreCommit(commitHash, repoPath) {
    if (!commitHash) {
      throw new Error('No commit hash provided for restore');
    }

    const currentBranch = await this.getCurrentBranchName(repoPath);
    const originalCommit = (await this.executeGitCommand('git rev-parse HEAD', repoPath)).stdout.trim();
    
    try {
      const tempIndex = this.fileService.createTempIndexFile(repoPath);
      
      try {
        const env = { 
          ...process.env,
          GIT_INDEX_FILE: tempIndex,
          GIT_AUTHOR_NAME: 'TimeLad',
          GIT_AUTHOR_EMAIL: 'timelad@example.com',
          GIT_COMMITTER_NAME: 'TimeLad',
          GIT_COMMITTER_EMAIL: 'timelad@example.com',
          GIT_EDITOR: 'true'
        };

        await this.executeGitCommand(`git read-tree ${commitHash}`, repoPath, 3, 200, env);
        const { stdout: newTree } = await this.executeGitCommand('git write-tree', repoPath, 3, 200, env);
        
        const { stdout: version } = await this.executeGitCommand(
          `git rev-list --count ${commitHash}`, 
          repoPath
        );
        
        const commitMessage = `Restored version ${version.trim()}\n\n` +
                            `This commit restores the repository to a previous state.\n` +
                            `Original commit: ${originalCommit}\n` +
                            `Restore time: ${new Date().toISOString()}`;
        
        const tempMsgFile = await this.fileService.createTempCommitFile(repoPath, commitMessage);
        
        try {
          const { stdout: newCommit } = await this.executeGitCommand(
            `git commit-tree ${newTree.trim()} -p ${originalCommit} -F "${tempMsgFile}"`,
            repoPath,
            3,
            200,
            env
          );
          
          const newCommitHash = newCommit.trim();
          
          if (!newCommitHash) {
            throw new Error('Failed to create new commit: No commit hash returned');
          }
          
          await this.executeGitCommand(
            `git update-ref refs/heads/${currentBranch} ${newCommitHash}`,
            repoPath
          );
          
          await this.executeGitCommand('git reset --hard', repoPath);
          
          return newCommitHash;
          
        } finally {
          await this.fileService.deleteFile(tempMsgFile);
        }
        
      } finally {
        await this.fileService.deleteFile(tempIndex);
      }
      
    } catch (error) {
      try {
        await this.executeGitCommand(`git checkout ${currentBranch}`, repoPath);
        await this.executeGitCommand(`git reset --hard ${originalCommit}`, repoPath);
      } catch (recoveryError) {
        console.error('Failed to recover original state:', recoveryError);
      }
      throw error;
    }
  }

  /**
   * Get uncommitted changes status
   * @param {string} repoPath Repository path
   * @returns {Promise<{hasChanges: boolean, files: Array, summary: string}>} Changes information
   */
  async getUncommittedChanges(repoPath = null) {
    if (!repoPath) {
      repoPath = await this.getRepositoryPath();
    }

    const { stdout } = await this.executeGitCommand(
      constants.GIT_COMMANDS.STATUS_PORCELAIN,
      repoPath
    );

    const hasChanges = !!stdout.trim();

    if (!hasChanges) {
      return { hasChanges: false, files: [], summary: "" };
    }

    const files = stdout
      .trim()
      .split("\n")
      .map((line) => {
        const status = line.substring(0, 2);
        const fileName = line.substring(3);
        return {
          status,
          fileName,
          type: this.parseFileStatus(status),
        };
      });

    try {
      const { stdout: diffStat } = await this.executeGitCommand(
        constants.GIT_COMMANDS.DIFF_STAT,
        repoPath
      );
      return { hasChanges: true, files, summary: diffStat };
    } catch (error) {
      const summary = `${files.length} file(s) changed`;
      return { hasChanges: true, files, summary };
    }
  }

  /**
   * Parse git status codes
   * @param {string} status Git status code
   * @returns {string} Human readable status
   */
  parseFileStatus(status) {
    const firstChar = status[0];
    const secondChar = status[1];
    let result = [];

    switch (firstChar) {
      case "M": result.push("modified"); break;
      case "A": result.push("added"); break;
      case "D": result.push("deleted"); break;
      case "R": result.push("renamed"); break;
      case "C": result.push("copied"); break;
      case "?": result.push("untracked"); break;
      case " ": break;
      default: result.push("unknown");
    }

    switch (secondChar) {
      case "M": result.push("modified"); break;
      case "D": result.push("deleted"); break;
      case "?": if (firstChar !== "?") result.push("untracked"); break;
      case " ": break;
    }

    return result.length > 0 ? result.join(", ") : "unchanged";
  }

  /**
   * Restore a specific version by creating a new commit
   * @param {Object} commit Commit object to restore
   * @param {string} repoPath Repository path
   * @returns {Promise<{success: boolean, message: string, newCommit: string}>} Result of the operation
   */
  async restoreVersion(commit, repoPath = null) {
    if (!repoPath) {
      repoPath = await this.getRepositoryPath();
    }
    
    await this.fileService.removeGitLockFile(repoPath);

    const currentBranch = await this.getCurrentBranchName(repoPath);
    const currentCommit = (await this.executeGitCommand('git rev-parse HEAD', repoPath)).stdout.trim();
    
    try {
      const { hasChanges, files } = await this.getUncommittedChanges(repoPath);
      
      if (hasChanges || files.length > 0) {
        const shouldProceed = await this.notificationService.showUncommittedChangesWarning(files);

        if (!shouldProceed) {
          return { success: false, message: "Restore cancelled by user." };
        }
        
        await this.executeGitCommand('git reset --hard', repoPath);
        await this.executeGitCommand('git clean -fd', repoPath);
        
        const { stdout: untracked } = await this.executeGitCommand('git ls-files --others --exclude-standard', repoPath);
        if (untracked.trim()) {
          await this.executeGitCommand('git clean -fdx', repoPath);
        }
      }

      try {
        await this.executeGitCommand('git reset --hard', repoPath, 3, 200);
        await this.executeGitCommand('git clean -fdx', repoPath, 3, 200);
      } catch (error) {
        await this.fileService.removeGitLockFile(repoPath);
        await this.executeGitCommand('git reset --hard', repoPath, 1, 500);
        await this.executeGitCommand('git clean -fdx', repoPath, 1, 500);
      }
      
      const newCommitHash = await this.createRestoreCommit(commit.hash, repoPath);
      
      await this.executeGitCommand('git reset --hard', repoPath);
      await this.executeGitCommand('git clean -fdx', repoPath);
      
      return { 
        success: true, 
        newCommit: newCommitHash,
        previousCommit: currentCommit,
        branch: currentBranch
      };
      
    } catch (error) {
      try {
        await this.executeGitCommand(`git checkout ${currentBranch}`, repoPath);
        await this.executeGitCommand(`git reset --hard ${currentCommit}`, repoPath);
        await this.executeGitCommand('git clean -fdx', repoPath);
      } catch (recoveryError) {
        console.error('Failed to recover original state:', recoveryError);
      }
      
      throw new Error(`${constants.ERRORS.RESTORE_VERSION_FAILED}: ${error.message}`);
    } finally {
      this.clearCache();
    }
  }

  /**
   * Save uncommitted changes with AI-generated commit message
   * @param {string} repoPath Repository path
   * @returns {Promise<string>} Commit message used
   */
  async saveChanges(repoPath = null) {
    if (!repoPath) {
      repoPath = await this.getRepositoryPath();
    }

    const changesInfo = await this.getUncommittedChanges(repoPath);

    if (!changesInfo.hasChanges) {
      throw new Error(constants.MESSAGES.NO_UNCOMMITTED_CHANGES);
    }

    await this.executeGitCommand(constants.GIT_COMMANDS.ADD_ALL, repoPath);

    const commitMessage = await this.aiService.generateCommitMessage(
      changesInfo.files,
      changesInfo.summary
    );

    const escapedMessage = commitMessage.replace(/"/g, '\\"');
    const commitCommand = constants.GIT_COMMANDS.COMMIT_MESSAGE.replace("%s", escapedMessage);

    await this.executeGitCommand(commitCommand, repoPath);

    return commitMessage;
  }

  /**
   * Discard all uncommitted changes in the repository
   * @param {string} repoPath Repository path
   * @returns {Promise<boolean>} True if changes were discarded successfully
   */
  async discardChanges(repoPath = null) {
    try {
      const repo = repoPath || (await this.getRepositoryPath());
      
      await this.executeGitCommand('git reset --hard HEAD', repo);
      await this.executeGitCommand('git clean -fd', repo);
      
      this.clearCache();
      
      return true;
    } catch (error) {
      console.error('Error discarding changes:', error);
      throw new Error(`Failed to discard changes: ${error.message}`);
    }
  }

  /**
   * Create a new Git repository in the current workspace
   * @returns {Promise<string>} Workspace path or null if user cancels
   */
  async createNewRepository() {
    try {
      const choice = await this.notificationService.showRepositoryCreationOptions();

      if (!choice) {
        return null; // User cancelled
      }

      if (choice === "github") {
        await this.notificationService.executeCommand(constants.COMMANDS.LOAD_FROM_GITHUB);
        return null;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error(constants.ERRORS.NO_WORKSPACE_FOLDER);
      }

      const workspacePath = workspaceFolders[0].uri.fsPath;

      return await this.notificationService.showProgress(
        constants.MESSAGES.SETTING_UP_VERSION_TRACKING,
        async (progress) => {
          progress.report({ increment: 0, message: "Initializing..." });

          await this.executeGitCommand(constants.GIT_COMMANDS.INIT_REPO, workspacePath);

          progress.report({ increment: 50, message: "Setting up configuration..." });

          try {
            await this.executeGitCommand(
              constants.GIT_COMMANDS.CONFIG_USER_NAME.replace("%s", "VS Code User"),
              workspacePath
            );
            await this.executeGitCommand(
              constants.GIT_COMMANDS.CONFIG_USER_EMAIL.replace("%s", "vscode@example.com"),
              workspacePath
            );
          } catch (configError) {
            console.log("TimeLad: Could not set local git config, using global config");
          }

          progress.report({ increment: 80, message: "Creating first save point..." });

          try {
            await this.executeGitCommand(constants.GIT_COMMANDS.ADD_ALL, workspacePath);
            await this.executeGitCommand(
              constants.GIT_COMMANDS.COMMIT_MESSAGE.replace(
                "%s",
                "🎉 First save! Welcome to TimeLad version tracking"
              ),
              workspacePath
            );
          } catch (commitError) {
            const readmePath = this.fileService.joinPath(workspacePath, "README.md");

            if (!this.fileService.existsSync(readmePath)) {
              this.fileService.writeFileSync(
                readmePath,
                "# My Project\n\nWelcome to your version-tracked project! 🚀\n"
              );
              await this.executeGitCommand("git add README.md", workspacePath);
              await this.executeGitCommand(
                constants.GIT_COMMANDS.COMMIT_MESSAGE.replace(
                  "%s",
                  "🎉 First save! Welcome to TimeLad version tracking"
                ),
                workspacePath
              );
            }
          }

          progress.report({ increment: 100, message: "Done!" });

          await this.notificationService.showInfo(constants.MESSAGES.REPO_CREATED_SUCCESS);

          setTimeout(() => {
            this.notificationService.executeCommand("git.refresh");
          }, 1000);

          return workspacePath;
        }
      );
    } catch (error) {
      await this.notificationService.showError(
        `${constants.ERRORS.REPO_CREATION_FAILED}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    this.repositoryScanCache.clear();
    this.aiService.clearCache();
  }
}

module.exports = GitService;