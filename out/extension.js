"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const GitHistoryWebviewProvider_1 = require("./providers/GitHistoryWebviewProvider");
const gitCommands_1 = require("./commands/gitCommands");
const constants = __importStar(require("./constants"));
/**
 * Extension activation function
 */
function activate(context) {
    console.log(`${constants.EXTENSION_NAME} is now active!`);
    // Alpha release warnings
    console.warn("⚠️  ALPHA RELEASE WARNING ⚠️");
    console.warn("TimeLad is an ALPHA version - use only for testing!");
    console.warn("This software may cause data loss or repository corruption.");
    console.warn("Do NOT use with important or production data.");
    console.warn("Always backup your repositories before testing.");
    // Initialize command handler
    const gitCommands = new gitCommands_1.GitCommands();
    // Create the webview provider for TimeLad view
    const gitHistoryProvider = new GitHistoryWebviewProvider_1.GitHistoryWebviewProvider(context);
    // Register webview provider
    const webviewProviderDisposable = vscode.window.registerWebviewViewProvider(constants.SIDEBAR_VIEW_ID, gitHistoryProvider);
    // Create a disposable for the provider's internal resources
    const providerDisposable = {
        dispose: () => gitHistoryProvider.dispose(),
    };
    // Register all commands
    const commandDisposables = [
        // Refresh command for the TimeLad view (used by native refresh button)
        vscode.commands.registerCommand(constants.COMMANDS.REFRESH_GIT_HISTORY, () => gitHistoryProvider.refresh()),
        // Internal commands (not exposed in command palette)
        vscode.commands.registerCommand(constants.COMMANDS.SAVE_TO_GITHUB, () => gitCommands.saveToGitHub()),
        vscode.commands.registerCommand(constants.COMMANDS.LOAD_FROM_GITHUB, () => gitCommands.loadFromGitHub()),
        // Public commands (exposed in command palette)
        vscode.commands.registerCommand(constants.COMMANDS.RESTORE_VERSION, (commit, repoPath) => gitCommands.restoreVersion(commit, repoPath)),
        vscode.commands.registerCommand(constants.COMMANDS.SAVE_CHANGES, () => gitCommands.saveChanges()),
        vscode.commands.registerCommand(constants.COMMANDS.SETUP_VERSION_TRACKING, () => gitCommands.setupVersionTracking())
    ];
    // Add all disposables to context
    context.subscriptions.push(webviewProviderDisposable, providerDisposable, ...commandDisposables);
    console.log(`${constants.EXTENSION_NAME}: All commands and providers registered successfully`);
    // Schedule periodic backup cleanup (every 24 hours)
    const cleanupInterval = setInterval(async () => {
        try {
            const gitService = gitCommands.getGitService();
            if (gitService) {
                const repoPath = await gitService.getRepositoryPath().catch(() => null);
                if (repoPath) {
                    console.log('Running scheduled backup cleanup...');
                    await gitService.cleanupOldBackups(repoPath, constants.BACKUP.RETENTION_DAYS);
                }
            }
        }
        catch (error) {
            console.error('Error during scheduled backup cleanup:', error);
        }
    }, 24 * 60 * 60 * 1000); // 24 hours
    // Register cleanup on deactivation
    context.subscriptions.push({
        dispose: () => clearInterval(cleanupInterval)
    });
}
exports.activate = activate;
/**
 * Extension deactivation function
 */
function deactivate() {
    console.log(`${constants.EXTENSION_NAME} extension deactivated`);
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map