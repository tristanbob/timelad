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
export declare const constants: ConstantsConfig;
export declare const CACHE_TIMEOUT: number;
export declare const MAX_COMMITS_SIDEBAR: number;
export declare const MAX_COMMITS_PANEL: number;
export declare const MAX_COMMITS_QUICKPICK: number;
export declare const PROGRESSIVE_LOADING: ProgressiveLoadingConfig;
export declare const EXTENSION_NAME: string;
export declare const GIT_EXTENSION_ID: string;
export declare const SIDEBAR_VIEW_ID: string;
export declare const COMMIT_DETAILS_VIEW_ID: string;
export declare const GIT_HISTORY_VIEW_ID: string;
export declare const COMMANDS: CommandsConfig;
export declare const GIT_COMMANDS: GitCommandsConfig;
export declare const MESSAGES: MessagesConfig;
export declare const BACKUP: BackupConfig;
export declare const ERRORS: ErrorsConfig;
export declare const TEMP_COMMIT_FILE: string;
export default constants;
//# sourceMappingURL=constants.d.ts.map