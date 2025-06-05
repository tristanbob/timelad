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
   * Get repository path safely
   * @returns {Promise<string>} Repository path
   * @throws {Error} If Git extension or repository not found
   */
  async getRepositoryPath() {
    const gitExtension = this.getGitExtension();

    if (!gitExtension) {
      throw new Error(constants.ERRORS.GIT_EXTENSION_NOT_FOUND);
    }

    const api = gitExtension.getAPI(1);

    if (!api.repositories || api.repositories.length === 0) {
      throw new Error(constants.ERRORS.NO_REPOSITORIES);
    }

    return api.repositories[0].rootUri.fsPath;
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

      // Checkout the specific commit's files
      const checkoutCommand = constants.GIT_COMMANDS.CHECKOUT_FILES.replace(
        "%s",
        commit.hash
      );
      await this.executeGitCommand(checkoutCommand, repoPath);

      // Check if there are any changes to commit
      const { stdout: diffOutput } = await this.executeGitCommand(
        constants.GIT_COMMANDS.DIFF_CACHED,
        repoPath
      );

      if (!diffOutput.trim()) {
        // Check working directory changes
        const { stdout: workingDiffOutput } = await this.executeGitCommand(
          constants.GIT_COMMANDS.DIFF_WORKING,
          repoPath
        );

        if (!workingDiffOutput.trim()) {
          vscode.window.showInformationMessage(
            `Already at Version ${commit.version} state. No changes needed.`
          );
          return;
        }
      }

      // Add all changes
      await this.executeGitCommand(constants.GIT_COMMANDS.ADD_ALL, repoPath);

      // Check again if there are changes after adding
      const { stdout: finalDiffOutput } = await this.executeGitCommand(
        constants.GIT_COMMANDS.DIFF_CACHED,
        repoPath
      );

      if (!finalDiffOutput.trim()) {
        vscode.window.showInformationMessage(
          `Already at Version ${commit.version} state. No changes needed.`
        );
        return;
      }

      // Create commit using temporary file
      await this.createRestoreCommit(commit, repoPath);

      // Get the new version number
      const newVersion = await this.getCommitCount(repoPath);

      vscode.window.showInformationMessage(
        `✅ Successfully restored to Version ${commit.version}!\nCreated new Version ${newVersion} with the restored state.`
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
    const restoreMessage = `Restore to Version ${commit.version}: ${commit.subject}

Restored state from commit ${commit.hash}
Original commit by: ${commit.author}
Original date: ${commit.date}

This is a safe restore that preserves all history.`;

    const tempMsgFile = path.join(repoPath, constants.TEMP_COMMIT_FILE);

    try {
      // Write commit message to temporary file
      fs.writeFileSync(tempMsgFile, restoreMessage, "utf8");

      // Commit using the file
      const commitCommand = constants.GIT_COMMANDS.COMMIT_FILE.replace(
        "%s",
        tempMsgFile
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
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = GitService;
