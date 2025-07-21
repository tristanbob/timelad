import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { 
  GitCommit, 
  GitRepository, 
  GitServiceInterface,
  NotificationServiceInterface,
  FileOperationsServiceInterface,
  CommitMessageServiceInterface
} from '../types';

// Import the constants - will need to be converted to TypeScript later
const constants = require('../constants');

// Import services
import { CommitMessageService } from './CommitMessageService';
const NotificationService = require('./NotificationService');
const FileOperationsService = require('./FileOperationsService');

const execPromise = promisify(exec);
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Feature flag for simplified restore - EASY TOGGLE FOR TESTING

// Extended interfaces for internal GitService use
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  error?: string | null;
}

interface CommitData {
  hash: string;
  author: string;
  date: string;
  subject: string;
  version: number;
}

interface FileChange {
  status: string;
  fileName: string;
  type: string;
}

interface UncommittedChanges {
  hasChanges: boolean;
  files: FileChange[];
  summary: string;
}

interface RestoreResult {
  success: boolean;
  message?: string;
  newCommit?: string;
  previousCommit?: string;
  branch?: string;
}

interface PaginatedCommits {
  commits: CommitData[];
  hasMore: boolean;
  totalCount: number;
  offset: number;
  nextOffset: number;
}

interface BranchInfo {
  branch: string | null;
  version: number | null;
}

interface GitCommandResult {
  stdout: string;
  stderr: string;
}

interface DirectoryEntry {
  name: string;
  isDirectory: () => boolean;
}

/**
 * Refactored GitService with separated concerns
 * Focuses purely on Git operations, delegating other responsibilities
 */
class GitService implements GitServiceInterface {
  private notificationService: NotificationServiceInterface;
  private fileService: FileOperationsServiceInterface;
  private commitMessageService: CommitMessageServiceInterface;
  private cache: Map<string, CacheEntry<any>>;
  private repositoryScanCache: Map<string, CacheEntry<any>>;
  private lastHealthCheck: Map<string, number>;

  constructor(
    notificationService: NotificationServiceInterface | null = null,
    fileService: FileOperationsServiceInterface | null = null,
    commitMessageService: CommitMessageServiceInterface | null = null
  ) {
    // Dependency injection for services
    this.notificationService = notificationService || new NotificationService();
    this.fileService = fileService || new FileOperationsService();
    this.commitMessageService = commitMessageService || new CommitMessageService();
    
    // Core Git service state
    this.cache = new Map();
    this.repositoryScanCache = new Map();
    this.lastHealthCheck = new Map();
  }

  /**
   * Get Git extension safely
   * @returns Git extension API or null
   */
  getGitExtension(): any | null {
    const extension = vscode.extensions.getExtension(constants.GIT_EXTENSION_ID);
    return extension ? extension.exports : null;
  }

  /**
   * Check if git is installed on the system
   * @returns True if git is installed
   */
  async isGitInstalled(): Promise<boolean> {
    try {
      await this.executeGitCommand("git --version", ".");
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for Git extension to be ready
   * @param maxAttempts Maximum number of attempts
   * @returns True if Git is ready, false if max attempts reached
   */
  async waitForGitReady(maxAttempts: number = 10): Promise<boolean> {
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
   * @param dirPath Directory path to check
   * @returns True if directory is a Git repository
   */
  async isGitRepository(dirPath: string): Promise<boolean> {
    try {
      await this.executeGitCommand("git rev-parse --git-dir", dirPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Scan workspace folders for git repositories
   * @param maxDepth Maximum depth to scan (default: 3)
   * @returns Array of repository paths found
   */
  async scanForRepositories(maxDepth: number = 3): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    const repositories: string[] = [];
    const scanPromises = workspaceFolders.map((folder) =>
      this.scanFolderForGit(folder.uri.fsPath, maxDepth)
    );

    try {
      const results = await Promise.all(scanPromises);
      results.forEach((folderRepos) => {
        repositories.push(...folderRepos);
      });
    } catch (error) {
      console.log(`TimeLad: Error scanning for repositories: ${(error as Error).message}`);
    }

    return repositories;
  }

  /**
   * Recursively scan a folder for git repositories
   * @param folderPath Path to scan
   * @param maxDepth Maximum depth to scan
   * @param currentDepth Current depth in recursion
   * @returns Array of repository paths found
   */
  async scanFolderForGit(
    folderPath: string,
    maxDepth: number,
    currentDepth: number = 0
  ): Promise<string[]> {
    const repositories: string[] = [];

    try {
      if (await this.isGitRepository(folderPath)) {
        repositories.push(folderPath);
        return repositories;
      }

      if (currentDepth < maxDepth) {
        try {
          const entries = await this.fileService.readDirectoryWithTypes!(folderPath);
          const subdirPromises = entries
            .filter(
              (entry: DirectoryEntry) =>
                entry.isDirectory() &&
                !entry.name.startsWith(".") &&
                entry.name !== "node_modules" &&
                entry.name !== "dist" &&
                entry.name !== "build"
            )
            .map((entry: DirectoryEntry) =>
              this.scanFolderForGit(
                this.fileService.joinPath!(folderPath, entry.name),
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
   * @returns Repository path
   * @throws Error if no repository found
   */
  async getRepositoryPathRobust(): Promise<string> {
    const cacheKey = "primary-repo-path";
    const cached = this.repositoryScanCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5000) {
      if (cached.error) {
        throw new Error(cached.error);
      }
      return cached.data;
    }

    let repositoryPath: string | null = null;
    let lastError: Error | null = null;

    try {
      // Method 1: Scan file system directly
      const repositories = await this.scanForRepositories(2);
      if (repositories.length > 0) {
        repositoryPath = repositories[0] ?? null;
        this.repositoryScanCache.set(cacheKey, {
          data: repositoryPath,
          timestamp: Date.now(),
          error: null,
        });
        return repositoryPath!;
      }
    } catch (error) {
      lastError = error as Error;
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
              repositoryPath = api.repositories[0]?.rootUri?.fsPath ?? null;
              if (repositoryPath) {
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
      }
    } catch (error) {
      lastError = error as Error;
    }

    // Method 3: Try git command directly on workspace folder
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders?.[0]) {
        const workspacePath = workspaceFolders[0]!.uri.fsPath;
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
      lastError = error as Error;
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
   * @returns True if repository exists
   */
  async hasRepositoryRobust(): Promise<boolean> {
    try {
      if (!(await this.isGitInstalled())) {
        console.log("TimeLad: Git is not installed on this system");
        return false;
      }

      await this.getRepositoryPathRobust();
      return true;
    } catch (error) {
      console.log(`TimeLad: No repository found - ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Get repository path safely
   * @returns Repository path
   */
  async getRepositoryPath(): Promise<string> {
    return this.getRepositoryPathRobust();
  }

  /**
   * Execute a Git command with retry logic
   * @param command Git command to execute
   * @param repoPath Repository path
   * @param maxRetries Maximum number of retry attempts
   * @param retryDelay Delay between retries in ms
   * @param envVars Additional environment variables
   * @returns Command result
   */
  async executeGitCommand(
    command: string,
    repoPath: string,
    maxRetries: number = 2,
    retryDelay: number = 100,
    envVars: Record<string, string> = {}
  ): Promise<GitCommandResult> {
    const options = { 
      cwd: repoPath,
      env: { ...process.env, ...envVars }
    };
    let lastError: Error;

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
        lastError = error as Error;
        
        if (lastError.message?.includes('index.lock') && attempt < maxRetries) {
          console.warn(`Git lock conflict (attempt ${attempt + 1}/${maxRetries}), retrying...`);
          await this.fileService.removeGitLockFile!(repoPath);
          await delay(retryDelay * (attempt + 1));
          continue;
        }
        
        break;
      }
    }
    
    const errorMessage = lastError! ? 
      `Error executing git command after ${maxRetries + 1} attempts: ${command}\n${lastError!.message || lastError}` :
      `Unknown error executing git command: ${command}`;
      
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Get total number of commits in repository
   * @param repoPath Repository path
   * @returns Total commit count
   */
  async getCommitCount(repoPath: string): Promise<number> {
    const { stdout } = await this.executeGitCommand(
      constants.GIT_COMMANDS.COUNT_COMMITS,
      repoPath
    );
    return parseInt(stdout.trim());
  }

  /**
   * Internal method to fetch commits with flexible options
   * @param options Options for commit retrieval
   * @returns Array of commit objects
   */
  async _getCommitsInternal(options: {
    limit?: number;
    repoPath?: string | null;
    useCache?: boolean;
    logFormat?: string;
  } = {}): Promise<CommitData[]> {
    const {
      limit = constants.MAX_COMMITS_SIDEBAR,
      repoPath: inputRepoPath = null,
      useCache = true,
      logFormat = constants.GIT_COMMANDS.LOG_FORMAT,
    } = options;

    const repoPath = inputRepoPath || await this.getRepositoryPath();

    const cacheKey = `commits-${repoPath}-${limit}-${logFormat.includes('LOG_FORMAT') ? 'detail' : 'simple'}`;
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < constants.CACHE_TIMEOUT) {
        return cached.data;
      }
    }

    const totalCommits = await this.getCommitCount(repoPath);
    const command = logFormat.replace("%d", limit.toString());
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
      .filter((commit): commit is CommitData => commit !== null);

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
   * @param limit Maximum number of commits to fetch
   * @param repoPath Repository path
   * @returns Array of commit objects
   */
  async getCommits(limit: number = constants.MAX_COMMITS_SIDEBAR, repoPath: string | null = null): Promise<CommitData[]> {
    try {
      return await this._getCommitsInternal({
        limit,
        repoPath,
        useCache: true,
        logFormat: constants.GIT_COMMANDS.LOG_FORMAT,
      });
    } catch (error) {
      throw new Error(`${constants.ERRORS.FETCH_COMMITS_FAILED}: ${(error as Error).message}`);
    }
  }

  /**
   * Get simple commits for QuickPick
   * @param repoPath Repository path
   * @returns Array of commit objects
   */
  async getSimpleCommits(repoPath: string | null = null): Promise<CommitData[]> {
    return this._getCommitsInternal({
      limit: constants.MAX_COMMITS_QUICKPICK,
      repoPath,
      useCache: false,
      logFormat: constants.GIT_COMMANDS.LOG_SIMPLE,
    });
  }

  /**
   * Get commits with pagination support for progressive loading
   * @param options Pagination options
   * @returns Paginated commits result
   */
  async getCommitsPaginated(options: {
    offset?: number;
    limit?: number;
    repoPath?: string | null;
    useCache?: boolean;
  } = {}): Promise<PaginatedCommits> {
    const {
      offset = 0,
      limit = constants.PROGRESSIVE_LOADING.INITIAL_LOAD_SIZE,
      repoPath: inputRepoPath = null,
      useCache = true
    } = options;

    const repoPath = inputRepoPath || await this.getRepositoryPath();

    const cacheKey = `commits-paginated-${repoPath}-${offset}-${limit}`;
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < constants.CACHE_TIMEOUT) {
        return cached.data;
      }
    }

    const totalCommits = await this.getCommitCount(repoPath);
    const command = `git log --skip=${offset} -n ${limit} --pretty=format:"%h|%an|%ad|%s" --date=format:"%Y-%m-%d %H:%M:%S"`;
    const { stdout } = await this.executeGitCommand(command, repoPath);

    const commits = stdout
      .split("\n")
      .map((line, index) => {
        if (!line.trim()) return null;
        const [hash, author, date, subject] = line.split("|");
        const versionNumber = totalCommits - offset - index;
        return {
          hash: hash || "",
          author: author || "Unknown",
          date: date || "",
          subject: subject || "No subject",
          version: versionNumber,
        };
      })
      .filter((commit): commit is CommitData => commit !== null);

    const hasMore = offset + commits.length < totalCommits;
    
    const result: PaginatedCommits = {
      commits,
      hasMore,
      totalCount: totalCommits,
      offset,
      nextOffset: offset + commits.length
    };

    if (useCache) {
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  /**
   * Get current branch information
   * @returns Current branch and version
   */
  async getCurrentBranchInfo(): Promise<BranchInfo> {
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
   * @param commitHash Commit hash
   * @param repoPath Repository path
   * @returns Detailed commit information
   */
  async getCommitDetails(commitHash: string, repoPath: string | null = null): Promise<string> {
    const repo = repoPath || await this.getRepositoryPath();

    const command = constants.GIT_COMMANDS.SHOW_COMMIT.replace("%s", commitHash);
    const { stdout } = await this.executeGitCommand(command, repo);
    return stdout;
  }

  /**
   * Check if working directory is clean
   * @param repoPath Repository path
   * @returns True if working directory is clean
   */
  async isWorkingDirectoryClean(repoPath: string): Promise<boolean> {
    const { stdout } = await this.executeGitCommand(
      constants.GIT_COMMANDS.STATUS_PORCELAIN,
      repoPath
    );
    return !stdout.trim();
  }

  /**
   * Stash current changes
   * @param repoPath Repository path
   */
  async stashChanges(repoPath: string): Promise<void> {
    await this.executeGitCommand(constants.GIT_COMMANDS.STASH_PUSH, repoPath);
  }

  /**
   * Get current branch name
   * @param repoPath Path to repository
   * @returns Current branch name
   */
  async getCurrentBranchName(repoPath: string): Promise<string> {
    const { stdout } = await this.executeGitCommand('git rev-parse --abbrev-ref HEAD', repoPath);
    return stdout.trim();
  }

  /**
   * Create a backup branch before destructive operations
   * @param repoPath Path to repository
   * @returns Name of the backup branch
   */
  async createBackupBranch(repoPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `timelad/backup/pre-restore-${timestamp}`;
    const currentBranch = await this.getCurrentBranchName(repoPath);
    
    await this.executeGitCommand(`git checkout -b ${branchName}`, repoPath);
    await this.executeGitCommand(`git checkout ${currentBranch}`, repoPath);
    
    return branchName;
  }

  /**
   * Clean up old backup branches
   * @param repoPath Path to repository
   * @param daysToKeep Number of days to keep backups
   */
  async cleanupOldBackups(repoPath: string, daysToKeep: number = 7): Promise<void> {
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
   * Create a new commit that restores the working directory to a specific commit (SIMPLIFIED VERSION)
   * @param commitHash Commit hash to restore
   * @param repoPath Repository path
   * @returns The new commit hash
   */
  async createRestoreCommitSimple(commitHash: string, repoPath: string): Promise<string> {
    if (!commitHash) {
      throw new Error('No commit hash provided for restore');
    }

    const startTime = Date.now();
    console.log('⚡ TimeLad: Starting simplified restore method');

    // Get metadata for commit message
    const originalCommit = (await this.executeGitCommand('git rev-parse HEAD', repoPath)).stdout.trim();
    const { stdout: version } = await this.executeGitCommand(`git rev-list --count ${commitHash}`, repoPath);
    
    try {
      // Simple restore using porcelain commands
      console.log(`🔍 TimeLad: Checking differences between current and target commit`);
      
      // First, check if the commits are actually different
      const { stdout: diffOutput } = await this.executeGitCommand(`git diff --name-only HEAD ${commitHash}`, repoPath);
      console.log(`🔍 TimeLad: Files different between commits: ${diffOutput.trim() || 'none'}`);
      
      if (!diffOutput.trim()) {
        // No differences between commits
        console.log('📝 TimeLad: Target commit is identical to current HEAD - no restore needed');
        return originalCommit;
      }
      
      // Proceed with restore using read-tree (like original but simpler)
      console.log(`🔄 TimeLad: Restoring files from ${commitHash}`);
      
      // Use read-tree to load the target commit's tree into the index
      await this.executeGitCommand(`git read-tree ${commitHash}`, repoPath);
      
      // Update working directory to match the index
      await this.executeGitCommand(`git checkout-index -a -f`, repoPath);
      
      // Clean up any files that shouldn't exist (were deleted in target commit)
      await this.executeGitCommand(`git clean -fd`, repoPath);
      
      // Verify something was staged
      const { stdout: stagedFiles } = await this.executeGitCommand('git diff --cached --name-only', repoPath);
      console.log(`📋 TimeLad: Staged files: ${stagedFiles.trim() || 'none'}`);
      
      if (!stagedFiles.trim()) {
        // This shouldn't happen if we detected differences above, but just in case
        console.log('⚠️ TimeLad: No files were staged after checkout - something unexpected happened');
        return originalCommit;
      }
      
      // Create commit message (same format as current)
      const commitMessage = `Restored version ${version.trim()}\n\n` +
                            `This commit restores the repository to a previous state.\n` +
                            `Original commit: ${originalCommit}\n` +
                            `Restore time: ${new Date().toISOString()}`;
      
      // Use temporary file for multiline commit message (like original but simpler)
      const tempMsgFile = await this.fileService.createTempCommitFile!(repoPath, commitMessage);
      
      try {
        await this.executeGitCommand(`git commit -F "${tempMsgFile}"`, repoPath);
      } finally {
        await this.fileService.deleteFile(tempMsgFile);
      }
      
      // Clean up: reset index to match the new commit (removes "uncommitted changes" appearance)
      await this.executeGitCommand('git reset --hard', repoPath);
      
      // Return new commit hash
      const { stdout: newCommit } = await this.executeGitCommand('git rev-parse HEAD', repoPath);
      const duration = Date.now() - startTime;
      console.log(`✅ TimeLad: Simplified restore completed successfully in ${duration}ms`);
      return newCommit.trim();
      
    } catch (error) {
      // Same error recovery as current implementation
      const duration = Date.now() - startTime;
      console.error(`❌ TimeLad: Simplified restore failed after ${duration}ms:`, error);
      await this.executeGitCommand(`git reset --hard ${originalCommit}`, repoPath);
      throw error;
    }
  }

  /**
   * Create a new commit that restores the working directory to a specific commit (COMPLEX/ORIGINAL VERSION - FALLBACK)
   * @param commitHash Commit hash to restore
   * @param repoPath Repository path
   * @returns The new commit hash
   */

  /**
   * Get uncommitted changes status
   * @param repoPath Repository path
   * @returns Changes information
   */
  async getUncommittedChanges(repoPath: string | null = null): Promise<UncommittedChanges> {
    const repo = repoPath || await this.getRepositoryPath();

    const { stdout } = await this.executeGitCommand(
      constants.GIT_COMMANDS.STATUS_PORCELAIN,
      repo
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
        repo
      );
      return { hasChanges: true, files, summary: diffStat };
    } catch (error) {
      const summary = `${files.length} file(s) changed`;
      return { hasChanges: true, files, summary };
    }
  }

  /**
   * Parse git status codes
   * @param status Git status code
   * @returns Human readable status
   */
  parseFileStatus(status: string): string {
    const firstChar = status[0];
    const secondChar = status[1];
    const result: string[] = [];

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
   * Restore a specific version by creating a new commit (SIMPLIFIED VERSION)
   * @param commit Commit object to restore
   * @param repoPath Repository path
   * @param skipConfirmation Skip uncommitted changes confirmation
   * @returns Result of the operation
   */
  async restoreVersionSimple(
    commit: CommitData,
    repoPath: string | null = null,
    skipConfirmation: boolean = false
  ): Promise<RestoreResult> {
    // Log that we're using the simplified method
    console.log('🚀 TimeLad: Using SIMPLIFIED restore method');
    this.notificationService.showInfo!('Using simplified restore method (3 Git commands)');
    
    const repo = repoPath || await this.getRepositoryPath();
    
    // Remove any git lock files
    await this.fileService.removeGitLockFile!(repo);

    const currentBranch = await this.getCurrentBranchName(repo);
    const currentCommit = (await this.executeGitCommand('git rev-parse HEAD', repo)).stdout.trim();
    
    try {
      // Handle uncommitted changes (same as current)
      const { hasChanges, files } = await this.getUncommittedChanges(repo);
      
      if (hasChanges || files.length > 0) {
        if (!skipConfirmation) {
          const shouldProceed = await this.notificationService.showUncommittedChangesWarning!(files);
          if (!shouldProceed) {
            return { success: false, message: "Restore cancelled by user." };
          }
        }
        
        // Clean uncommitted changes
        await this.executeGitCommand('git reset --hard', repo);
        await this.executeGitCommand('git clean -fd', repo);
      }

      // Create restore commit using simplified method
      const newCommitHash = await this.createRestoreCommitSimple(commit.hash, repo);
      
      console.log('✅ TimeLad: Simplified restore completed successfully');
      this.notificationService.showInfo!('Version restored successfully using simplified method');
      
      return { 
        success: true, 
        newCommit: newCommitHash,
        previousCommit: currentCommit,
        branch: currentBranch
      };
      
    } catch (error) {
      // Same error recovery as current
      try {
        await this.executeGitCommand(`git checkout ${currentBranch}`, repo);
        await this.executeGitCommand(`git reset --hard ${currentCommit}`, repo);
        await this.executeGitCommand('git clean -fdx', repo);
      } catch (recoveryError) {
        console.error('Failed to recover original state:', recoveryError);
      }
      
      throw new Error(`${constants.ERRORS.RESTORE_VERSION_FAILED}: ${(error as Error).message}`);
    } finally {
      this.clearCache();
    }
  }

  /**
   * Restore a specific version by creating a new commit (ORIGINAL VERSION)
   * @param commit Commit object to restore
   * @param repoPath Repository path
   * @param skipConfirmation Skip uncommitted changes confirmation
   * @returns Result of the operation
   */
  async restoreVersion(
    commit: CommitData,
    repoPath: string | null = null,
    skipConfirmation: boolean = false
  ): Promise<RestoreResult> {
    console.log('🚀 TimeLad: Using simplified restore method');
    return await this.restoreVersionSimple(commit, repoPath, skipConfirmation);
  }

  /**
   * Save uncommitted changes with auto-generated commit message
   * @param repoPath Repository path
   * @returns Commit message used
   */
  async saveChanges(repoPath: string | null = null): Promise<string> {
    const repo = repoPath || await this.getRepositoryPath();

    const changesInfo = await this.getUncommittedChanges(repo);

    if (!changesInfo.hasChanges) {
      throw new Error(constants.MESSAGES.NO_UNCOMMITTED_CHANGES);
    }

    await this.executeGitCommand(constants.GIT_COMMANDS.ADD_ALL, repo);

    const commitMessage = await this.commitMessageService.generateCommitMessage(
      changesInfo.files,
      changesInfo.summary
    );

    const escapedMessage = commitMessage.replace(/"/g, '\\"');
    const commitCommand = constants.GIT_COMMANDS.COMMIT_MESSAGE.replace("%s", escapedMessage);

    await this.executeGitCommand(commitCommand, repo);

    return commitMessage;
  }

  /**
   * Discard all uncommitted changes in the repository
   * @param repoPath Repository path
   * @returns True if changes were discarded successfully
   */
  async discardChanges(repoPath: string | null = null): Promise<boolean> {
    try {
      const repo = repoPath || (await this.getRepositoryPath());
      
      await this.executeGitCommand('git reset --hard HEAD', repo);
      await this.executeGitCommand('git clean -fd', repo);
      
      this.clearCache();
      
      return true;
    } catch (error) {
      console.error('Error discarding changes:', error);
      throw new Error(`Failed to discard changes: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new Git repository in the current workspace
   * @returns Workspace path or null if user cancels
   */
  async createNewRepository(): Promise<string | null> {
    try {
      const choice = await this.notificationService.showRepositoryCreationOptions!();

      if (!choice) {
        return null; // User cancelled
      }

      if (choice === "github") {
        await this.notificationService.executeCommand!(constants.COMMANDS.LOAD_FROM_GITHUB);
        return null;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.[0]) {
        throw new Error(constants.ERRORS.NO_WORKSPACE_FOLDER);
      }

      const workspacePath = workspaceFolders[0]!.uri.fsPath;

      return await this.notificationService.showProgress!(
        constants.MESSAGES.SETTING_UP_VERSION_TRACKING,
        async (progress: vscode.Progress<{increment?: number; message?: string}>) => {
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
            const readmePath = this.fileService.joinPath!(workspacePath, "README.md");

            if (!this.fileService.existsSync!(readmePath)) {
              this.fileService.writeFileSync!(
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

          await this.notificationService.showInfo!(constants.MESSAGES.REPO_CREATED_SUCCESS);

          setTimeout(() => {
            this.notificationService.executeCommand!("git.refresh");
          }, 1000);

          return workspacePath;
        }
      );
    } catch (error) {
      await this.notificationService.showError(
        `${constants.ERRORS.REPO_CREATION_FAILED}: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.repositoryScanCache.clear();
    this.commitMessageService.clearCache();
  }

  // Implementation of GitServiceInterface methods
  
  /**
   * Find repositories in workspace
   * @returns Array of found repositories
   */
  async findRepositories(): Promise<GitRepository[]> {
    const repositoryPaths = await this.scanForRepositories();
    return repositoryPaths.map(path => ({
      path,
      name: path.split(/[\\/]/).pop() || 'Unknown',
      isValid: true
    }));
  }

  /**
   * Get commit history for interface compliance
   * @param repoPath Repository path
   * @param limit Number of commits to fetch
   * @returns Array of GitCommit objects
   */
  async getCommitHistory(repoPath?: string, limit?: number): Promise<GitCommit[]> {
    const commits = await this.getCommits(limit, repoPath || null);
    return commits.map(commit => ({
      hash: commit.hash,
      message: commit.subject,
      author: commit.author,
      date: commit.date,
      subject: commit.subject
    }));
  }

  /**
   * Restore to a specific commit
   * @param commitHash Hash of commit to restore to
   * @param message Optional commit message
   * @returns True if successful
   */
  async restoreToCommit(commitHash: string, message?: string): Promise<boolean> {
    try {
      const commit = { hash: commitHash, author: '', date: '', subject: message || '', version: 0 };
      const result = await this.restoreVersion(commit);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Save changes with message for interface compliance
   * @param message Commit message
   * @returns True if successful
   */
  async saveChangesWithMessage(message: string): Promise<boolean> {
    try {
      await this.saveChanges();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Discard uncommitted changes for interface compliance
   * @returns True if successful
   */
  async discardUncommittedChanges(): Promise<boolean> {
    return this.discardChanges();
  }

  /**
   * Check if there are uncommitted changes
   * @returns True if there are uncommitted changes
   */
  async hasUncommittedChanges(): Promise<boolean> {
    try {
      const changes = await this.getUncommittedChanges();
      return changes.hasChanges;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current repository
   * @returns Current repository or null
   */
  getCurrentRepository(): GitRepository | null {
    // This would need to be implemented with proper state management
    // For now, return null to satisfy the interface
    return null;
  }
}

export { GitService };