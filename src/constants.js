/**
 * Extension constants
 */
module.exports = {
  // Cache settings
  CACHE_TIMEOUT: 5 * 60 * 1000, // 5 minutes

  // Git settings
  MAX_COMMITS_SIDEBAR: 30,
  MAX_COMMITS_PANEL: 30,
  MAX_COMMITS_QUICKPICK: 20,

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
