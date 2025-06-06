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
    SHOW_GIT_INFO: "timelad.showGitInfo",
    SHOW_GIT_HISTORY: "timelad.showGitHistory",
    LIST_COMMITS: "timelad.listCommits",
    REFRESH_GIT_HISTORY: "timelad.refreshGitHistory",
    RESTORE_VERSION: "timelad.restoreVersion",
    TOGGLE_EXPERT_MODE: "timelad.toggleExpertMode",
    SAVE_CHANGES: "timelad.saveChanges",
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
  },

  // Error messages
  ERRORS: {
    GIT_EXTENSION_NOT_FOUND:
      "Git extension not found. Please ensure Git is installed and the Git extension is enabled.",
    NO_REPOSITORIES:
      "No Git repositories found in the current workspace. Please open a Git repository.",
    FETCH_COMMITS_FAILED: "Failed to fetch commits",
    RESTORE_VERSION_FAILED: "Failed to restore version",
    SHOW_COMMIT_DETAILS_FAILED: "Error showing commit details",
  },

  // File paths
  TEMP_COMMIT_FILE: ".git/COMMIT_EDITMSG_TIMELAD",
};
