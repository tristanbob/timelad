const vscode = require("vscode");
const { exec } = require("child_process");
const util = require("util");
const fs = require("fs");
const path = require("path");
const constants = require("../constants");

const execPromise = util.promisify(exec);

/**
 * Service class for Git operations
 */
class GitService {
  constructor() {
    this.cache = new Map();
    this.repositoryScanCache = new Map(); // Cache for repository scanning results
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
   * Check if Git system is ready and has repositories
   * @returns {Promise<boolean>} True if git is ready and has repositories
   */
  async isGitSystemReady() {
    try {
      const gitExtension = this.getGitExtension();

      if (!gitExtension) {
        return false;
      }

      const api = gitExtension.getAPI(1);

      if (!api) {
        return false;
      }

      // Check if repositories array is available (even if empty)
      // This indicates git extension is fully initialized
      return Array.isArray(api.repositories);
    } catch (error) {
      return false;
    }
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
   * Check if a specific folder is a git repository
   * @param {string} folderPath Path to check
   * @returns {Promise<boolean>} True if folder is a git repository
   */
  async isGitRepository(folderPath) {
    try {
      // Check for .git folder
      const gitPath = path.join(folderPath, ".git");
      const gitStat = await fs.promises.stat(gitPath);

      if (gitStat.isDirectory()) {
        // Standard git repository
        return true;
      } else if (gitStat.isFile()) {
        // Could be a git worktree (contains path to actual .git folder)
        const gitContent = await fs.promises.readFile(gitPath, "utf8");
        return gitContent.trim().startsWith("gitdir:");
      }
    } catch (error) {
      // .git doesn't exist or not accessible
    }

    return false;
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
   * Get repository path safely
   * @returns {Promise<string>} Repository path
   * @throws {Error} If Git extension or repository not found
   */
  async getRepositoryPath() {
    // Check if git is installed first
    const gitInstalled = await this.isGitInstalled();

    if (!gitInstalled) {
      throw new Error(constants.ERRORS.GIT_NOT_INSTALLED);
    }

    // Use the robust repository path detection
    return await this.getRepositoryPathRobust();
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
   * Get commits with version numbers
   * @param {number} limit Maximum number of commits to fetch
   * @param {string} repoPath Repository path
   * @returns {Promise<Array>} Array of commit objects
   */
  async getCommits(limit = constants.MAX_COMMITS_SIDEBAR, repoPath = null) {
    try {
      if (!repoPath) {
        repoPath = await this.getRepositoryPath();
      }

      // Check cache first
      const cacheKey = `commits-${repoPath}-${limit}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < constants.CACHE_TIMEOUT) {
        return cached.data;
      }

      const totalCommits = await this.getCommitCount(repoPath);

      // Get detailed commit information
      const command = constants.GIT_COMMANDS.LOG_FORMAT.replace("%d", limit);
      const { stdout } = await this.executeGitCommand(command, repoPath);

      // Process the git log output and add version numbers
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

      // Cache the results
      this.cache.set(cacheKey, {
        data: commits,
        timestamp: Date.now(),
      });

      return commits;
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
    if (!repoPath) {
      repoPath = await this.getRepositoryPath();
    }

    const totalCommits = await this.getCommitCount(repoPath);

    const command = constants.GIT_COMMANDS.LOG_SIMPLE.replace(
      "%d",
      constants.MAX_COMMITS_QUICKPICK
    );
    const { stdout } = await this.executeGitCommand(command, repoPath);

    return stdout
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
   * Restore a specific version by creating a new commit
   * @param {Object} commit Commit object to restore
   * @param {string} repoPath Repository path
   * @throws {Error} If restore operation fails
   */
  async restoreVersion(commit, repoPath = null) {
    try {
      if (!repoPath) {
        repoPath = await this.getRepositoryPath();
      }

      // Check if working directory is clean
      const isClean = await this.isWorkingDirectoryClean(repoPath);
      if (!isClean) {
        const stashChoice = await vscode.window.showWarningMessage(
          "You have uncommitted changes. Would you like to stash them before restoring?",
          "Stash Changes",
          "Cancel"
        );

        if (stashChoice === "Stash Changes") {
          await this.stashChanges(repoPath);
          vscode.window.showInformationMessage(
            constants.MESSAGES.CHANGES_STASHED
          );
        } else {
          return;
        }
      }

      // Get the current HEAD commit hash to compare
      const { stdout: currentHead } = await this.executeGitCommand(
        constants.GIT_COMMANDS.REV_PARSE_HEAD,
        repoPath
      );
      const currentHeadHash = currentHead.trim();

      // If we're trying to restore to the current commit, create an empty commit anyway
      if (commit.hash === currentHeadHash) {
        await this.createEmptyRestoreCommit(commit, repoPath);
      } else {
        // Use git read-tree + checkout-index for reliable file restoration
        // This approach ensures all files from the target commit are properly restored
        // without temporarily moving HEAD

        // Step 1: Read the target commit's tree into the index
        await this.executeGitCommand(`git read-tree ${commit.hash}`, repoPath);

        // Step 2: Update working directory to match the index
        await this.executeGitCommand("git checkout-index -a -f", repoPath);

        // Step 3: Stage all changes (the difference between current and restored state)
        await this.executeGitCommand(constants.GIT_COMMANDS.ADD_ALL, repoPath);

        // Step 4: Check if there are actually changes to commit
        const { stdout: stagedChanges } = await this.executeGitCommand(
          constants.GIT_COMMANDS.DIFF_CACHED,
          repoPath
        );

        if (stagedChanges.trim()) {
          // Create commit with the restored changes
          await this.createRestoreCommit(commit, repoPath);
        } else {
          // No actual changes detected, create empty commit to document the action
          await this.createEmptyRestoreCommit(commit, repoPath);
        }
      }

      // Get the new version number
      const newVersion = await this.getCommitCount(repoPath);

      vscode.window.showInformationMessage(
        `✅ Successfully restored to Version ${commit.version}!\nCreated new Version ${newVersion} with description "Restored version ${commit.version}".`
      );

      // Clear cache after successful restore
      this.clearCache();
    } catch (error) {
      throw new Error(
        `${constants.ERRORS.RESTORE_VERSION_FAILED}: ${error.message}`
      );
    }
  }

  /**
   * Create a restore commit using a temporary file
   * @param {Object} commit Commit object to restore
   * @param {string} repoPath Repository path
   */
  async createRestoreCommit(commit, repoPath) {
    const restoreMessage = `Restored version ${commit.version}`;

    const tempMsgFile = path.join(repoPath, constants.TEMP_COMMIT_FILE);

    try {
      // Write commit message to temporary file
      fs.writeFileSync(tempMsgFile, restoreMessage, "utf8");

      // Commit using the file - convert Windows backslashes to forward slashes for git
      const gitCompatiblePath = tempMsgFile.replace(/\\/g, "/");
      const commitCommand = constants.GIT_COMMANDS.COMMIT_FILE.replace(
        "%s",
        gitCompatiblePath
      );
      await this.executeGitCommand(commitCommand, repoPath);

      // Clean up temporary file
      fs.unlinkSync(tempMsgFile);
    } catch (error) {
      // Clean up temporary file even if commit fails
      if (fs.existsSync(tempMsgFile)) {
        fs.unlinkSync(tempMsgFile);
      }
      throw error;
    }
  }

  /**
   * Create an empty restore commit when no changes are detected
   * @param {Object} commit Commit object to restore
   * @param {string} repoPath Repository path
   */
  async createEmptyRestoreCommit(commit, repoPath) {
    const restoreMessage = `Restored version ${commit.version}`;

    const tempMsgFile = path.join(repoPath, constants.TEMP_COMMIT_FILE);

    try {
      // Write commit message to temporary file
      fs.writeFileSync(tempMsgFile, restoreMessage, "utf8");

      // Create empty commit to document the restore action - convert Windows backslashes to forward slashes for git
      const gitCompatiblePath = tempMsgFile.replace(/\\/g, "/");
      const commitCommand = constants.GIT_COMMANDS.COMMIT_EMPTY.replace(
        "%s",
        gitCompatiblePath
      );
      await this.executeGitCommand(commitCommand, repoPath);

      // Clean up temporary file
      fs.unlinkSync(tempMsgFile);
    } catch (error) {
      // Clean up temporary file even if commit fails
      if (fs.existsSync(tempMsgFile)) {
        fs.unlinkSync(tempMsgFile);
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
   * Check if a repository exists in the current workspace
   * Uses enhanced detection with file system scanning
   * @returns {Promise<boolean>} True if repository exists
   */
  async hasRepository() {
    // Use the enhanced detection method
    return await this.hasRepositoryRobust();
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
   * Offer to create a new repository or load from GitHub when none exists
   * Uses friendly, non-technical language to explain what this means
   * @returns {Promise<string|null>} Action to take or null if cancelled
   */
  async offerToCreateRepository() {
    const message = `🚀 Hey there! It looks like this folder isn't set up for tracking your work history yet.

What would you like to do?`;

    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      "Set Up Version Tracking",
      "Load from GitHub",
      "Not Right Now"
    );

    if (result === "Load from GitHub") {
      // Trigger the Load from GitHub command
      vscode.commands.executeCommand("timelad.loadFromGitHub");
      return null; // Don't create a new repo
    }

    return result === "Set Up Version Tracking" ? "create" : null;
  }

  /**
   * Create a new Git repository in the current workspace
   * Provides friendly feedback about what's happening
   * @returns {Promise<string>} Workspace path
   */
  async createNewRepository() {
    try {
      // First, offer the user the choice between creating new repo or loading from GitHub
      const userChoice = await this.offerToCreateRepository();

      if (userChoice !== "create") {
        // User cancelled or chose to load from GitHub (handled in offerToCreateRepository)
        return null;
      }
      // Get the current workspace folder
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
