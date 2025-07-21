/**
 * Extension constants
 */

export interface ProgressiveLoadingConfig {
  INITIAL_LOAD_SIZE: number;
  LOAD_MORE_SIZE: number;
  PRELOAD_THRESHOLD: number;
  MAX_DOM_ITEMS: number;
  BUFFER_SIZE: number;
}

export interface CommandsConfig {
  REFRESH_GIT_HISTORY: string;
  RESTORE_VERSION: string;
  SAVE_CHANGES: string;
  SETUP_VERSION_TRACKING: string;
  SAVE_TO_GITHUB: string;
  LOAD_FROM_GITHUB: string;
}

export interface GitCommandsConfig {
  COUNT_COMMITS: string;
  STATUS_PORCELAIN: string;
  STATUS_LONG: string;
  STASH_PUSH: string;
  LOG_FORMAT: string;
  LOG_SIMPLE: string;
  SHOW_COMMIT: string;
  CHECKOUT_FILES: string;
  DIFF_CACHED: string;
  DIFF_WORKING: string;
  DIFF_STAT: string;
  ADD_ALL: string;
  COMMIT_FILE: string;
  COMMIT_MESSAGE: string;
  COMMIT_EMPTY: string;
  REV_PARSE_HEAD: string;
  INIT_REPO: string;
  CONFIG_USER_NAME: string;
  CONFIG_USER_EMAIL: string;
  RESET_HARD: string;
  RESET_SOFT_HEAD: string;
}

export interface MessagesConfig {
  EXTENSION_ACTIVATED: string;
  LOADING_HISTORY: string;
  RESTORING_VERSION: string;
  CHANGES_STASHED: string;
  NO_COMMITS: string;
  NOT_ON_BRANCH: string;
  INVALID_RESTORE_PARAMS: string;
  SAVING_CHANGES: string;
  CHANGES_SAVED: string;
  NO_UNCOMMITTED_CHANGES: string;
  GENERATING_COMMIT_MESSAGE: string;
  REPO_CREATED_SUCCESS: string;
  SETTING_UP_VERSION_TRACKING: string;
  SAVING_TO_GITHUB: string;
  GITHUB_SAVE_SUCCESS: string;
  GITHUB_REPO_CREATED: string;
  LOADING_FROM_GITHUB: string;
  GITHUB_LOAD_SUCCESS: string;
  BACKUP_CREATED: string;
  BACKUP_RESTORED: string;
  CLEANING_BACKUPS: string;
  BACKUPS_CLEANED: string;
}

export interface BackupConfig {
  BRANCH_PREFIX: string;
  RETENTION_DAYS: number;
  MAX_BACKUPS: number;
}

export interface ErrorsConfig {
  GIT_EXTENSION_NOT_FOUND: string;
  GIT_EXTENSION_NOT_READY: string;
  GIT_NOT_INSTALLED: string;
  NO_REPOSITORIES: string;
  FETCH_COMMITS_FAILED: string;
  RESTORE_VERSION_FAILED: string;
  BACKUP_CREATION_FAILED: string;
  BACKUP_RESTORE_FAILED: string;
  SHOW_COMMIT_DETAILS_FAILED: string;
  NO_WORKSPACE_FOLDER: string;
  REPO_CREATION_FAILED: string;
  GITHUB_AUTH_FAILED: string;
  GITHUB_SAVE_FAILED: string;
  GITHUB_REPO_CREATE_FAILED: string;
  GITHUB_LOAD_FAILED: string;
}

export interface ConstantsConfig {
  CACHE_TIMEOUT: number;
  MAX_COMMITS_SIDEBAR: number;
  MAX_COMMITS_PANEL: number;
  MAX_COMMITS_QUICKPICK: number;
  PROGRESSIVE_LOADING: ProgressiveLoadingConfig;
  EXTENSION_NAME: string;
  GIT_EXTENSION_ID: string;
  SIDEBAR_VIEW_ID: string;
  COMMIT_DETAILS_VIEW_ID: string;
  GIT_HISTORY_VIEW_ID: string;
  COMMANDS: CommandsConfig;
  GIT_COMMANDS: GitCommandsConfig;
  MESSAGES: MessagesConfig;
  BACKUP: BackupConfig;
  ERRORS: ErrorsConfig;
  TEMP_COMMIT_FILE: string;
}

export const constants: ConstantsConfig = {
  // Cache settings
  CACHE_TIMEOUT: 5 * 60 * 1000, // 5 minutes

  // Git settings
  MAX_COMMITS_SIDEBAR: 30,
  MAX_COMMITS_PANEL: 30,
  MAX_COMMITS_QUICKPICK: 20,
  
  // Progressive loading settings
  PROGRESSIVE_LOADING: {
    INITIAL_LOAD_SIZE: 20,
    LOAD_MORE_SIZE: 15,
    PRELOAD_THRESHOLD: 5, // Load more when 5 items from bottom
    MAX_DOM_ITEMS: 100, // Keep only 100 items in DOM for performance
    BUFFER_SIZE: 10, // Keep 10 extra items above/below viewport
  },

  // Extension identifiers
  EXTENSION_NAME: "TimeLad",
  GIT_EXTENSION_ID: "vscode.git",

  // View identifiers
  SIDEBAR_VIEW_ID: "timelad-git-history",
  COMMIT_DETAILS_VIEW_ID: "timelad.commitDetails",
  GIT_HISTORY_VIEW_ID: "timelad.gitHistory",

  // Command identifiers
  COMMANDS: {
    // Core commands - exposed in command palette
    REFRESH_GIT_HISTORY: "timelad.refreshGitHistory",
    RESTORE_VERSION: "timelad.restoreVersion",
    SAVE_CHANGES: "timelad.saveChanges",
    SETUP_VERSION_TRACKING: "timelad.setupVersionTracking",
    
    // Internal commands - used programmatically but not in command palette
    SAVE_TO_GITHUB: "timelad.saveToGitHub",
    LOAD_FROM_GITHUB: "timelad.loadFromGitHub",
  },

  // Git command templates
  GIT_COMMANDS: {
    COUNT_COMMITS: "git rev-list --count HEAD",
    STATUS_PORCELAIN: "git status --porcelain",
    STATUS_LONG: "git status",
    STASH_PUSH: 'git stash push -m "Auto-stash before TimeLad restore"',
    LOG_FORMAT:
      'git log -n %d --pretty=format:"%h|%an|%ad|%s" --date=format:"%Y-%m-%d %H:%M:%S"',
    LOG_SIMPLE: 'git log -n %d --pretty=format:"%h|%an|%ar|%s"',
    SHOW_COMMIT: "git show %s --stat --pretty=fuller",
    CHECKOUT_FILES: "git checkout %s -- .",
    DIFF_CACHED: "git diff --cached --name-only",
    DIFF_WORKING: "git diff --name-only",
    DIFF_STAT: "git diff --stat",
    ADD_ALL: "git add .",
    COMMIT_FILE: 'git commit -F "%s"',
    COMMIT_MESSAGE: 'git commit -m "%s"',
    COMMIT_EMPTY: 'git commit --allow-empty -F "%s"',
    REV_PARSE_HEAD: "git rev-parse HEAD",
    INIT_REPO: "git init",
    CONFIG_USER_NAME: 'git config user.name "%s"',
    CONFIG_USER_EMAIL: 'git config user.email "%s"',
    RESET_HARD: "git reset --hard %s",
    RESET_SOFT_HEAD: "git reset --soft HEAD@{1}",
  },

  // Messages
  MESSAGES: {
    EXTENSION_ACTIVATED: "TimeLad extension is now active!",
    LOADING_HISTORY: "Loading history...",
    RESTORING_VERSION: "Restoring version...",
    CHANGES_STASHED: "Changes stashed successfully.",
    NO_COMMITS: "No commits found in this repository.",
    NOT_ON_BRANCH: "Not on any branch",
    INVALID_RESTORE_PARAMS: "TimeLad: Invalid restore parameters",
    SAVING_CHANGES: "Saving changes...",
    CHANGES_SAVED: "Changes saved successfully!",
    NO_UNCOMMITTED_CHANGES: "No uncommitted changes to save.",
    GENERATING_COMMIT_MESSAGE: "Generating commit message...",
    REPO_CREATED_SUCCESS:
      "🎉 Awesome! Your project is now set up for version tracking. You can see your work history in the TimeLad sidebar!",
    SETTING_UP_VERSION_TRACKING: "Setting up version tracking...",
    SAVING_TO_GITHUB: "Saving to GitHub...",
    GITHUB_SAVE_SUCCESS: "Successfully saved to GitHub!",
    GITHUB_REPO_CREATED: "GitHub repository created successfully!",
    LOADING_FROM_GITHUB: "Loading from GitHub...",
    GITHUB_LOAD_SUCCESS: "Successfully loaded from GitHub!",
    BACKUP_CREATED: "Backup created successfully.",
    BACKUP_RESTORED: "Successfully restored from backup.",
    CLEANING_BACKUPS: "Cleaning up old backups...",
    BACKUPS_CLEANED: "Old backups cleaned up successfully.",
  },

  // Backup settings
  BACKUP: {
    BRANCH_PREFIX: 'timelad/backup/',
    RETENTION_DAYS: 7,
    MAX_BACKUPS: 10,
  },

  // Error messages
  ERRORS: {
    GIT_EXTENSION_NOT_FOUND:
      "Git extension not found. Please ensure Git is installed and the Git extension is enabled.",
    GIT_EXTENSION_NOT_READY:
      "Git extension is not ready yet. Please wait a moment and try again.",
    GIT_NOT_INSTALLED:
      "Git is not installed on this system. Please install Git and restart VS Code.",
    NO_REPOSITORIES:
      "No Git repositories found in the current workspace. Please open a Git repository.",
    FETCH_COMMITS_FAILED: "Failed to fetch commits",
    RESTORE_VERSION_FAILED: "Failed to restore version",
    BACKUP_CREATION_FAILED: "Failed to create backup",
    BACKUP_RESTORE_FAILED: "Failed to restore from backup",
    SHOW_COMMIT_DETAILS_FAILED: "Error showing commit details",
    NO_WORKSPACE_FOLDER: "Please open a folder in VS Code first.",
    REPO_CREATION_FAILED: "Could not set up version tracking",
    GITHUB_AUTH_FAILED:
      "GitHub authentication failed. Please check your token.",
    GITHUB_SAVE_FAILED: "Failed to save to GitHub",
    GITHUB_REPO_CREATE_FAILED: "Failed to create GitHub repository",
    GITHUB_LOAD_FAILED: "Failed to load from GitHub",
  },

  // File paths
  TEMP_COMMIT_FILE: ".git/COMMIT_EDITMSG_TIMELAD",
};

// For backward compatibility, export individual properties
export const CACHE_TIMEOUT = constants.CACHE_TIMEOUT;
export const MAX_COMMITS_SIDEBAR = constants.MAX_COMMITS_SIDEBAR;
export const MAX_COMMITS_PANEL = constants.MAX_COMMITS_PANEL;
export const MAX_COMMITS_QUICKPICK = constants.MAX_COMMITS_QUICKPICK;
export const PROGRESSIVE_LOADING = constants.PROGRESSIVE_LOADING;
export const EXTENSION_NAME = constants.EXTENSION_NAME;
export const GIT_EXTENSION_ID = constants.GIT_EXTENSION_ID;
export const SIDEBAR_VIEW_ID = constants.SIDEBAR_VIEW_ID;
export const COMMIT_DETAILS_VIEW_ID = constants.COMMIT_DETAILS_VIEW_ID;
export const GIT_HISTORY_VIEW_ID = constants.GIT_HISTORY_VIEW_ID;
export const COMMANDS = constants.COMMANDS;
export const GIT_COMMANDS = constants.GIT_COMMANDS;
export const MESSAGES = constants.MESSAGES;
export const BACKUP = constants.BACKUP;
export const ERRORS = constants.ERRORS;
export const TEMP_COMMIT_FILE = constants.TEMP_COMMIT_FILE;

// Default export for backward compatibility
export default constants;