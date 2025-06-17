const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const vscode = require("vscode");
const { promisify } = util;
const fsUnlink = promisify(fs.unlink);
const fsExists = promisify(fs.exists);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const constants = require("../constants");
const execPromise = promisify(exec);

/**
 * Service class for Git operations
 */
class GitService {
  constructor() {
    this.cache = new Map();
    this.repositoryScanCache = new Map(); // Cache for repository scanning results
    this.lastHealthCheck = new Map(); // Track last health check time per repo
  }

  /**
   * Get Git extension safely
   * @returns {Object|null} Git extension API or null
   */
  getGitExtension() {
    const extension = vscode.extensions.getExtension(
      constants.GIT_EXTENSION_ID
    );
    return extension ? extension.exports : null;
  }

  /**
   * Check if git is installed on the system
   * @returns {Promise<boolean>} True if git is installed
   */
  async isGitInstalled() {
    try {
      // Try to run git --version to check if git is available
      await this.executeGitCommand("git --version", ".");
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for Git extension to be ready (simplified approach)
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

      // Wait 100ms between attempts (much faster than before)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return false;
  }


  /**
   * Scan workspace folders for git repositories (similar to VS Code Source Control)
   * This provides a more robust detection than relying only on Git extension
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
      // Check if this folder itself is a git repository
      if (await this.isGitRepository(folderPath)) {
        repositories.push(folderPath);
        // If we found a repo, don't scan deeper (avoid nested repo confusion)
        return repositories;
      }

      // If we haven't reached max depth, scan subdirectories
      if (currentDepth < maxDepth) {
        try {
          const entries = await fs.promises.readdir(folderPath, {
            withFileTypes: true,
          });
          const subdirPromises = entries
            .filter(
              (entry) =>
                entry.isDirectory() &&
                !entry.name.startsWith(".") && // Skip hidden folders
                entry.name !== "node_modules" && // Skip node_modules
                entry.name !== "dist" && // Skip build folders
                entry.name !== "build"
            )
            .map((entry) =>
              this.scanFolderForGit(
                path.join(folderPath, entry.name),
                maxDepth,
                currentDepth + 1
              )
            );

          const subdirResults = await Promise.all(subdirPromises);
          subdirResults.forEach((subdirRepos) => {
            repositories.push(...subdirRepos);
          });
        } catch (error) {
          // Ignore errors reading directory (permissions, etc.)
        }
      }
    } catch (error) {
      // Ignore errors for individual folders
    }

    return repositories;
  }

  /**
   * Get the primary repository path from workspace
   * Uses multi-layered detection: file system scan + Git extension + git command
   * @returns {Promise<string>} Repository path
   * @throws {Error} If no repository found
   */
  async getRepositoryPathRobust() {
    // Check cache first (with shorter timeout for faster updates)
    const cacheKey = "primary-repo-path";
    const cached = this.repositoryScanCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5000) {
      // 5 second cache
      if (cached.error) {
        throw new Error(cached.error);
      }
      return cached.data;
    }

    let repositoryPath = null;
    let lastError = null;

    try {
      // Method 1: Scan file system directly (most reliable and fast)
      const repositories = await this.scanForRepositories(2); // Limit depth for speed
      if (repositories.length > 0) {
        repositoryPath = repositories[0]; // Use first found repository

        // Cache successful result
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

    // Method 2: Try Git extension (if file system scan failed)
    try {
      if (await this.isGitInstalled()) {
        // Wait briefly for Git extension, but don't block too long
        const gitReady = await this.waitForGitReady(5); // Reduced attempts for speed

        if (gitReady) {
          const gitExtension = this.getGitExtension();
          if (gitExtension) {
            const api = gitExtension.getAPI(1);
            if (api && api.repositories && api.repositories.length > 0) {
              repositoryPath = api.repositories[0].rootUri.fsPath;

              // Cache successful result
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

        // If git command succeeds, this is a repository
        repositoryPath = workspacePath;

        // Cache successful result
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

    // No repository found - cache the error to avoid repeated scanning
    const errorMessage = lastError
      ? lastError.message
      : constants.ERRORS.NO_REPOSITORIES;
    this.repositoryScanCache.set(cacheKey, {
      data: null,
      timestamp: Date.now(),
      error: errorMessage,
    });

    throw new Error(errorMessage);
  }

  /**
   * Enhanced repository detection with robust scanning
   * @returns {Promise<boolean>} True if repository exists
   */
  async hasRepositoryRobust() {
    try {
      // First, check if git is actually installed on the system
      const gitInstalled = await this.isGitInstalled();

      if (!gitInstalled) {
        console.log("TimeLad: Git is not installed on this system");
        return false;
      }

      // Use the robust repository path detection
      await this.getRepositoryPathRobust();
      return true;
    } catch (error) {
      console.log(`TimeLad: No repository found - ${error.message}`);
      return false;
    }
  }

  /**
   * Get repository path safely (alias for getRepositoryPathRobust)
   * @returns {Promise<string>} Repository path
   * @throws {Error} If Git is not installed or no repository found
   */
  async getRepositoryPath() {
    return this.getRepositoryPathRobust();
  }

  /**
   * Execute a Git command
   * @param {string} command Git command to execute
   * @param {string} repoPath Repository path
   * @returns {Promise<{stdout: string, stderr: string}>} Command result
   */
  async executeGitCommand(command, repoPath) {
    return await execPromise(command, { cwd: repoPath });
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
   * @private
   * @param {Object} options Options for commit retrieval
   * @param {number} [options.limit=30] Maximum number of commits to fetch
   * @param {string} [options.repoPath=null] Repository path
   * @param {boolean} [options.useCache=true] Whether to use cache
   * @param {string} [options.logFormat=constants.GIT_COMMANDS.LOG_FORMAT] Git log format command
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

    // Check cache if enabled
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

    // Cache the results if enabled
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
   * @throws {Error} If commit retrieval fails
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
      throw new Error(
        `${constants.ERRORS.FETCH_COMMITS_FAILED}: ${error.message}`
      );
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

    const command = constants.GIT_COMMANDS.SHOW_COMMIT.replace(
      "%s",
      commitHash
    );
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
   * Create a backup branch before destructive operations
   * @param {string} repoPath Path to repository
   * @returns {Promise<string>} Name of the backup branch
   */
  async createBackupBranch(repoPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `timelad/backup/pre-restore-${timestamp}`;
    const currentBranch = await this.getCurrentBranchName(repoPath);
    
    // Create and switch to backup branch
    await this.executeGitCommand(`git checkout -b ${branchName}`, repoPath);
    
    // Switch back to original branch
    await this.executeGitCommand(`git checkout ${currentBranch}`, repoPath);
    
    return branchName;
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
      // Ignore errors during cleanup
      console.warn('Error during backup cleanup:', error);
    }
  }

  /**
   * Create a new commit that restores the working directory to a specific commit
   * using Git's plumbing commands to avoid editor issues
   * @param {string} commitHash Commit hash to restore
   * @param {string} repoPath Repository path
   * @returns {Promise<string>} The new commit hash
   */
  async createRestoreCommit(commitHash, repoPath) {
    if (!commitHash) {
      throw new Error('No commit hash provided for restore');
    }

    // Get the current branch name and commit
    const currentBranch = await this.getCurrentBranchName(repoPath);
    const originalCommit = (await this.executeGitCommand('git rev-parse HEAD', repoPath)).stdout.trim();
    
    try {
      // 1. Get the current tree and parent commit
        
      // 2. Create a temporary index file
      const tempIndex = path.join(repoPath, '.git', `index-${Date.now()}`);
      
      try {
        // 3. Set up environment for git operations
        const env = { 
          ...process.env,
          GIT_INDEX_FILE: tempIndex,
          GIT_AUTHOR_NAME: 'TimeLad',
          GIT_AUTHOR_EMAIL: 'timelad@example.com',
          GIT_COMMITTER_NAME: 'TimeLad',
          GIT_COMMITTER_EMAIL: 'timelad@example.com',
          GIT_EDITOR: 'true' // Prevent editor from opening
        };

        // 4. Reset to the target commit in the temporary index
        await this.executeGitCommand(`git read-tree ${commitHash}`, repoPath, 3, 200, env);
        
        // 5. Write the tree from the temporary index
        const { stdout: newTree } = await this.executeGitCommand('git write-tree', repoPath, 3, 200, env);
        
        // 6. Create a commit message
        // Get the version number by counting commits from the beginning
        const { stdout: version } = await this.executeGitCommand(
          `git rev-list --count ${commitHash}`, 
          repoPath
        );
        
        const commitMessage = `Restored version ${version.trim()}\n\n` +
                            `This commit restores the repository to a previous state.\n` +
                            `Original commit: ${originalCommit}\n` +
                            `Restore time: ${new Date().toISOString()}`;
        
        // 6. Create the commit using git commit-tree
        // First, write the commit message to a temporary file to avoid shell escaping issues
        const tempMsgFile = path.join(repoPath, '.git', `COMMIT_EDITMSG-${Date.now()}`);
        try {
          await fs.promises.writeFile(tempMsgFile, commitMessage);
          
          // Use the temporary file for the commit message
          const { stdout: newCommit } = await this.executeGitCommand(
            `git commit-tree ${newTree.trim()} -p ${originalCommit} -F "${tempMsgFile}"`,
            repoPath,
            3, // maxRetries
            200, // retryDelay
            env // environment variables
          );
          
          const newCommitHash = newCommit.trim();
          
          if (!newCommitHash) {
            throw new Error('Failed to create new commit: No commit hash returned');
          }
          
          // 7. Update the current branch to point to the new commit
          await this.executeGitCommand(
            `git update-ref refs/heads/${currentBranch} ${newCommitHash}`,
            repoPath
          );
          
          // 8. Reset the working directory to match the new commit
          await this.executeGitCommand('git reset --hard', repoPath);
          
          return newCommitHash;
          
        } finally {
          // Clean up the temporary message file
          try {
            if (fs.existsSync(tempMsgFile)) {
              fs.unlinkSync(tempMsgFile);
            }
          } catch (e) {
            console.warn('Failed to clean up temporary message file:', e);
          }
        }
        
      } catch (error) {
        console.error('Error during restore commit:', error);
        throw new Error(`Failed to create restore commit: ${error.message}`);
      } finally {
        // Clean up the temporary index file
        try {
          if (fs.existsSync(tempIndex)) {
            fs.unlinkSync(tempIndex);
          }
        } catch (e) {
          console.warn('Failed to clean up temporary index:', e);
        }
      }
      
    } catch (error) {
      // If anything fails, restore the original state
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
   * Restore a specific version by creating a new commit that represents the restore point
   * This ensures all versions remain accessible in the Git history
   * @param {Object} commit Commit object to restore
   * @param {string} repoPath Repository path
   * @returns {Promise<{success: boolean, message: string, newCommit: string}>} Result of the operation
   * @throws {Error} If restore operation fails
   */
  async restoreVersion(commit, repoPath = null) {
    if (!repoPath) {
      repoPath = await this.getRepositoryPath();
    }
    
    // Ensure we have a clean working directory by removing any stale lock files
    await this.removeGitLockFile(repoPath);

    // Get current branch and commit before any changes
    const currentBranch = await this.getCurrentBranchName(repoPath);
    const currentCommit = (await this.executeGitCommand('git rev-parse HEAD', repoPath)).stdout.trim();
    
    try {
      // 1. Check for uncommitted changes and notify user they will be discarded
      const { hasChanges, files } = await this.getUncommittedChanges(repoPath);
      
      if (hasChanges || files.length > 0) {
        const fileList = files.slice(0, 5).map(f => `- ${f.fileName} (${f.status})`).join('\n');
        const moreFiles = files.length > 5 ? `\n...and ${files.length - 5} more files` : '';
        
        const choice = await vscode.window.showWarningMessage(
          `You have ${files.length} uncommitted change(s) that will be permanently lost.\n\n${fileList}${moreFiles}\n\nDo you want to discard all changes and restore to the selected version?`,
          { modal: true },
          'Discard All Changes and Restore',
          'Cancel'
        );

        if (choice !== 'Discard All Changes and Restore') {
          return { success: false, message: "Restore cancelled by user." };
        }
        
        // Reset any uncommitted changes and remove untracked files
        await this.executeGitCommand('git reset --hard', repoPath);
        await this.executeGitCommand('git clean -fd', repoPath);
        
        // Check for any remaining untracked or ignored files
        const { stdout: untracked } = await this.executeGitCommand('git ls-files --others --exclude-standard', repoPath);
        if (untracked.trim()) {
          await this.executeGitCommand('git clean -fdx', repoPath);
        }
      }

      // 2. Clean the working directory completely before restore
      // Add retry logic for these operations as they might fail due to lock files
      try {
        await this.executeGitCommand('git reset --hard', repoPath, 3, 200);
        await this.executeGitCommand('git clean -fdx', repoPath, 3, 200);
      } catch (error) {
        // If we still have issues after retries, try one more time after removing lock files
        await this.removeGitLockFile(repoPath);
        await this.executeGitCommand('git reset --hard', repoPath, 1, 500);
        await this.executeGitCommand('git clean -fdx', repoPath, 1, 500);
      }
      
      // 3. Create a restore commit that brings in the target state
      const newCommitHash = await this.createRestoreCommit(commit.hash, repoPath);
      
      // 4. Clean up any files that shouldn't be in the working directory after restore
      await this.executeGitCommand('git reset --hard', repoPath);
      await this.executeGitCommand('git clean -fdx', repoPath);
      
      // No notification or refresh needed - the view will be refreshed by the caller
      
      return { 
        success: true, 
        newCommit: newCommitHash,
        previousCommit: currentCommit,
        branch: currentBranch
      };
      
    } catch (error) {
      // If anything fails, try to return to the original state
      try {
        await this.executeGitCommand(`git checkout ${currentBranch}`, repoPath);
        await this.executeGitCommand(`git reset --hard ${currentCommit}`, repoPath);
        await this.executeGitCommand('git clean -fdx', repoPath);
      } catch (recoveryError) {
        console.error('Failed to recover original state:', recoveryError);
      }
      
      throw new Error(
        `${constants.ERRORS.RESTORE_VERSION_FAILED}: ${error.message}`
      );
    } finally {
      this.clearCache();
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

    // Parse the git status output to get file changes
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

    // Get detailed diff stat for summary
    try {
      const { stdout: diffStat } = await this.executeGitCommand(
        constants.GIT_COMMANDS.DIFF_STAT,
        repoPath
      );
      return { hasChanges: true, files, summary: diffStat };
    } catch (error) {
      // If diff stat fails, create a basic summary
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

    // Index status (first character)
    switch (firstChar) {
      case "M":
        result.push("modified");
        break;
      case "A":
        result.push("added");
        break;
      case "D":
        result.push("deleted");
        break;
      case "R":
        result.push("renamed");
        break;
      case "C":
        result.push("copied");
        break;
      case "?":
        result.push("untracked");
        break;
      case " ":
        break; // no index change
      default:
        result.push("unknown");
    }

    // Working tree status (second character)
    switch (secondChar) {
      case "M":
        result.push("modified");
        break;
      case "D":
        result.push("deleted");
        break;
      case "?":
        if (firstChar !== "?") result.push("untracked");
        break;
      case " ":
        break; // no working tree change
    }

    return result.length > 0 ? result.join(", ") : "unchanged";
  }

  /**
   * Generate AI commit message using VSCode's built-in AI or fallback
   * @param {Array} files Array of changed files
   * @param {string} summary Git diff summary
   * @returns {Promise<string>} Generated commit message
   */
  async generateCommitMessage(files, summary) {
    try {
      // Try to use VSCode's built-in AI first
      const aiMessage = await this.tryVSCodeAI(files, summary);
      if (aiMessage) {
        return aiMessage;
      }
    } catch (error) {
      console.log("VSCode AI not available, using fallback:", error.message);
    }

    // Fallback to rule-based commit message generation
    return this.generateFallbackCommitMessage(files, summary);
  }

  /**
   * Try to use VSCode's built-in AI for commit message generation
   * @param {Array} files Array of changed files
   * @param {string} summary Git diff summary
   * @returns {Promise<string|null>} AI generated message or null
   */
  async tryVSCodeAI(files, summary) {
    try {
      // Check if GitHub Copilot extension is available and active
      const copilotExtension = vscode.extensions.getExtension("GitHub.copilot");

      if (!copilotExtension || !copilotExtension.isActive) {
        return null;
      }

      // Try to access Copilot's API
      const copilotApi = copilotExtension.exports;

      if (!copilotApi || !copilotApi.generateCommitMessage) {
        return null;
      }

      // Use Copilot to generate commit message
      const prompt = this.buildCommitPrompt(files, summary);
      const aiResponse = await copilotApi.generateCommitMessage(prompt);

      return aiResponse ? aiResponse.trim() : null;
    } catch (error) {
      console.log("Failed to use VSCode AI:", error);
      return null;
    }
  }

  /**
   * Safely remove Git index.lock file if it exists
   * @param {string} repoPath Path to the repository
   * @returns {Promise<boolean>} True if lock file was removed, false otherwise
   */
  async removeGitLockFile(repoPath) {
    const lockFilePath = path.join(repoPath, '.git', 'index.lock');
    try {
      if (await fsExists(lockFilePath)) {
        await fsUnlink(lockFilePath);
        console.log(`Removed Git lock file: ${lockFilePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`Failed to remove Git lock file: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute a Git command with retry logic for lock-related failures
   * @param {string} command Git command to execute
   * @param {string} repoPath Repository path
   * @param {number} [maxRetries=2] Maximum number of retry attempts
   * @param {number} [retryDelay=100] Delay between retries in ms
   * @param {Object} [envVars={}] Additional environment variables to pass to the command
   * @returns {Promise<{stdout: string, stderr: string}>} Command result
   */
  async executeGitCommand(command, repoPath, maxRetries = 2, retryDelay = 100, envVars = {}) {
    const execPromise = util.promisify(exec);
    const options = { 
      cwd: repoPath,
      env: { ...process.env, ...envVars }
    };
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { stdout, stderr } = await execPromise(command, options);
        if (stderr && !stderr.includes('warning: ')) { // Only log non-warning stderr
          console.warn(`Git stderr: ${stderr}`);
        }
        return { 
          stdout: stdout ? stdout.trim() : '', 
          stderr: stderr ? stderr.trim() : '' 
        };
      } catch (error) {
        lastError = error;
        
        // If we get a lock-related error and have retries left
        if (error.message && error.message.includes('index.lock') && attempt < maxRetries) {
          console.warn(`Git lock conflict (attempt ${attempt + 1}/${maxRetries}), retrying...`);
          await this.removeGitLockFile(repoPath);
          await delay(retryDelay * (attempt + 1)); // Exponential backoff
          continue;
        }
        
        // For other errors or no retries left, break the loop
        break;
      }
    }
    
    // If we get here, all retries failed
    const errorMessage = lastError ? 
      `Error executing git command after ${maxRetries + 1} attempts: ${command}\n${lastError.message || lastError}` :
      `Unknown error executing git command: ${command}`;
      
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Build prompt for AI commit message generation
   * @param {Array} files Array of changed files
   * @param {string} summary Git diff summary
   * @returns {string} Formatted prompt
   */
  buildCommitPrompt(files, summary) {
    const fileList = files.map((f) => `${f.type}: ${f.fileName}`).join("\n");

    return `Generate a concise git commit message for the following changes:

Files changed:
${fileList}

Summary:
${summary}

Please provide a clear, conventional commit message (50 chars or less for the subject line).`;
  }

  /**
   * Generate fallback commit message using rule-based approach
   * @param {Array} files Array of changed files
   * @param {string} summary Git diff summary
   * @returns {string} Generated commit message
   */
  generateFallbackCommitMessage(files, summary) {
    if (files.length === 0) {
      return "chore: update files";
    }

    // Analyze file types and changes
    const fileTypes = new Set();
    const changeTypes = new Set();

    files.forEach((file) => {
      // Extract file extension
      const ext = file.fileName.split(".").pop().toLowerCase();
      fileTypes.add(ext);

      // Track change types
      if (file.type.includes("added")) changeTypes.add("add");
      if (file.type.includes("modified")) changeTypes.add("update");
      if (file.type.includes("deleted")) changeTypes.add("remove");
      if (file.type.includes("renamed")) changeTypes.add("rename");
    });

    // Determine commit type based on files and changes
    let commitType = "chore";
    let subject = "";

    // Determine type based on file extensions
    if (
      fileTypes.has("js") ||
      fileTypes.has("ts") ||
      fileTypes.has("jsx") ||
      fileTypes.has("tsx")
    ) {
      commitType = "feat";
    } else if (
      fileTypes.has("css") ||
      fileTypes.has("scss") ||
      fileTypes.has("less")
    ) {
      commitType = "style";
    } else if (fileTypes.has("md") || fileTypes.has("txt")) {
      commitType = "docs";
    } else if (
      fileTypes.has("json") ||
      fileTypes.has("yml") ||
      fileTypes.has("yaml")
    ) {
      commitType = "config";
    }

    // Generate subject based on changes
    if (files.length === 1) {
      const file = files[0];
      const fileName = file.fileName.split("/").pop();

      if (changeTypes.has("add")) {
        subject = `add ${fileName}`;
      } else if (changeTypes.has("remove")) {
        subject = `remove ${fileName}`;
      } else if (changeTypes.has("rename")) {
        subject = `rename ${fileName}`;
      } else {
        subject = `update ${fileName}`;
      }
    } else {
      const mainChangeType = changeTypes.has("add")
        ? "add"
        : changeTypes.has("update")
        ? "update"
        : changeTypes.has("remove")
        ? "remove"
        : "modify";

      subject = `${mainChangeType} ${files.length} files`;
    }

    return `${commitType}: ${subject}`;
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

    // Check if there are uncommitted changes
    const changesInfo = await this.getUncommittedChanges(repoPath);

    if (!changesInfo.hasChanges) {
      throw new Error(constants.MESSAGES.NO_UNCOMMITTED_CHANGES);
    }

    // Add all changes
    await this.executeGitCommand(constants.GIT_COMMANDS.ADD_ALL, repoPath);

    // Generate commit message
    const commitMessage = await this.generateCommitMessage(
      changesInfo.files,
      changesInfo.summary
    );

    // Commit with the generated message
    const escapedMessage = commitMessage.replace(/"/g, '\\"');
    const commitCommand = constants.GIT_COMMANDS.COMMIT_MESSAGE.replace(
      "%s",
      escapedMessage
    );

    await this.executeGitCommand(commitCommand, repoPath);

    return commitMessage;
  }

  /**
   * Show helpful message when git is not installed
   * @returns {Promise<void>}
   */
  async showGitNotInstalledMessage() {
    const message = `🔧 Git is not installed on your system.

TimeLad needs Git to track your project's history. Git is a free tool that helps you manage your code versions.

To install Git:
• Windows: Download from git-scm.com
• Mac: Install Xcode Command Line Tools or use Homebrew
• Linux: Use your package manager (apt, yum, etc.)

After installing Git, please restart VS Code.`;

    await vscode.window
      .showErrorMessage(message, { modal: true }, "Open Git Website")
      .then((selection) => {
        if (selection === "Open Git Website") {
          vscode.env.openExternal(
            vscode.Uri.parse("https://git-scm.com/downloads")
          );
        }
      });
  }

  /**
   * Create a new Git repository in the current workspace
   * Provides friendly feedback about what's happening
   * @returns {Promise<string>} Workspace path or null if user cancels or chooses GitHub
   */
  async createNewRepository() {
    try {
      // Show QuickPick for repository creation options
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: "$(repo-create) Create New Repository",
            description: "Initialize a new Git repository in this workspace",
            value: "create",
          },
          {
            label: "$(github) Load from GitHub",
            description: "Clone an existing repository from GitHub",
            value: "github",
          },
        ],
        {
          placeHolder: "No Git repository found. What would you like to do?",
          ignoreFocusOut: true,
        }
      );

      if (!choice) {
        return null; // User cancelled
      }

      if (choice.value === "github") {
        // Execute the loadFromGitHub command
        await vscode.commands.executeCommand(constants.COMMANDS.LOAD_FROM_GITHUB);
        return null;
      }

      // Proceed with creating a new repository
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error(constants.ERRORS.NO_WORKSPACE_FOLDER);
      }

      const workspacePath = workspaceFolders[0].uri.fsPath;

      // Show progress indicator
      return await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: constants.MESSAGES.SETTING_UP_VERSION_TRACKING,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0, message: "Initializing..." });

          // Initialize Git repository
          await this.executeGitCommand(
            constants.GIT_COMMANDS.INIT_REPO,
            workspacePath
          );

          progress.report({
            increment: 50,
            message: "Setting up configuration...",
          });

          // Set up initial configuration
          try {
            await this.executeGitCommand(
              constants.GIT_COMMANDS.CONFIG_USER_NAME.replace(
                "%s",
                "VS Code User"
              ),
              workspacePath
            );
            await this.executeGitCommand(
              constants.GIT_COMMANDS.CONFIG_USER_EMAIL.replace(
                "%s",
                "vscode@example.com"
              ),
              workspacePath
            );
          } catch (configError) {
            // If config fails, that's okay - user might have global config
            console.log(
              "TimeLad: Could not set local git config, using global config"
            );
          }

          progress.report({
            increment: 80,
            message: "Creating first save point...",
          });

          // Create an initial commit if there are files
          try {
            await this.executeGitCommand(
              constants.GIT_COMMANDS.ADD_ALL,
              workspacePath
            );
            await this.executeGitCommand(
              constants.GIT_COMMANDS.COMMIT_MESSAGE.replace(
                "%s",
                "🎉 First save! Welcome to TimeLad version tracking"
              ),
              workspacePath
            );
          } catch (commitError) {
            // If commit fails (no files to commit), create a README
            const readmePath = path.join(workspacePath, "README.md");

            if (!fs.existsSync(readmePath)) {
              fs.writeFileSync(
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

          // Show success message
          vscode.window.showInformationMessage(
            constants.MESSAGES.REPO_CREATED_SUCCESS
          );

          // Refresh the Git extension to recognize the new repository
          setTimeout(() => {
            vscode.commands.executeCommand("git.refresh");
          }, 1000);

          return workspacePath;
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `${constants.EXTENSION_NAME}: ${constants.ERRORS.REPO_CREATION_FAILED}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    this.repositoryScanCache.clear(); // Clear repository scan cache too
  }
}

module.exports = GitService;
