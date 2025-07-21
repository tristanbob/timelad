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
exports.GitHubService = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
class GitHubService {
    constructor() {
        this.baseURL = "https://api.github.com";
    }
    async getGitHubToken() {
        const config = vscode.workspace.getConfiguration("timelad");
        let token = config.get("githubToken");
        if (!token) {
            token = await vscode.window.showInputBox({
                prompt: "Enter your GitHub Personal Access Token",
                placeHolder: "ghp_xxxxxxxxxxxxxxxxxxxx",
                password: true,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return "GitHub token is required";
                    }
                    if (!value.startsWith("ghp_") && !value.startsWith("github_pat_")) {
                        return "Please enter a valid GitHub Personal Access Token";
                    }
                    return null;
                },
            });
            if (!token) {
                throw new Error("GitHub token is required for GitHub operations");
            }
            const saveToken = await vscode.window.showQuickPick(["Yes", "No"], {
                placeHolder: "Save GitHub token for future use?",
                ignoreFocusOut: true,
            });
            if (saveToken === "Yes") {
                await config.update("githubToken", token, vscode.ConfigurationTarget.Global);
            }
        }
        return token;
    }
    async makeGitHubRequest(endpoint, method = "GET", data = null) {
        const token = await this.getGitHubToken();
        return new Promise((resolve, reject) => {
            const options = {
                hostname: "api.github.com",
                path: endpoint,
                method: method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "TimeLad-VSCode-Extension",
                },
            };
            if (data) {
                const jsonData = JSON.stringify(data);
                options.headers["Content-Type"] = "application/json";
                options.headers["Content-Length"] = Buffer.byteLength(jsonData).toString();
            }
            const req = https.request(options, (res) => {
                let responseData = "";
                res.on("data", (chunk) => {
                    responseData += chunk;
                });
                res.on("end", () => {
                    try {
                        const parsedData = JSON.parse(responseData);
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsedData);
                        }
                        else {
                            const error = parsedData;
                            reject(new Error(`GitHub API Error: ${error.message || "Unknown error"}`));
                        }
                    }
                    catch (error) {
                        reject(new Error(`Failed to parse GitHub API response: ${error.message}`));
                    }
                });
            });
            req.on("error", (error) => {
                reject(new Error(`GitHub API request failed: ${error.message}`));
            });
            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }
    async getUser() {
        return await this.makeGitHubRequest("/user");
    }
    async repositoryExists(owner, repo) {
        try {
            await this.makeGitHubRequest(`/repos/${owner}/${repo}`);
            return true;
        }
        catch (error) {
            if (error.message.includes("Not Found")) {
                return false;
            }
            throw error;
        }
    }
    async createRepository(name, description = "", isPrivate = false) {
        const data = {
            name: name,
            description: description,
            private: isPrivate,
            auto_init: false,
        };
        return await this.makeGitHubRequest("/user/repos", "POST", data);
    }
    async addRemoteAndPush(repoPath, remoteUrl) {
        try {
            try {
                await execPromise("git remote get-url origin", { cwd: repoPath });
                await execPromise(`git remote set-url origin ${remoteUrl}`, {
                    cwd: repoPath,
                });
            }
            catch (error) {
                await execPromise(`git remote add origin ${remoteUrl}`, {
                    cwd: repoPath,
                });
            }
            await execPromise("git push -u origin main", { cwd: repoPath });
        }
        catch (error) {
            try {
                await execPromise("git push -u origin master", { cwd: repoPath });
            }
            catch (masterError) {
                throw new Error(`Failed to push to GitHub: ${error.message}`);
            }
        }
    }
    async getUserRepositories(limit = 100) {
        const repos = await this.makeGitHubRequest(`/user/repos?per_page=${limit}&sort=updated`);
        return repos.map((repo) => ({
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description || "No description",
            cloneUrl: repo.clone_url,
            isPrivate: repo.private,
            updatedAt: repo.updated_at,
            language: repo.language,
        }));
    }
    async cloneRepository(cloneUrl, targetPath) {
        try {
            await execPromise(`git clone "${cloneUrl}" "${targetPath}"`);
        }
        catch (error) {
            throw new Error(`Failed to clone repository: ${error.message}`);
        }
    }
    // Legacy interface methods for backward compatibility
    async saveToGitHub(content, filename) {
        // This would need to be implemented based on specific requirements
        // For now, returning false to maintain interface compatibility
        return false;
    }
    async loadFromGitHub(filename) {
        // This would need to be implemented based on specific requirements
        // For now, returning empty string to maintain interface compatibility
        return "";
    }
    isAuthenticated() {
        const config = vscode.workspace.getConfiguration("timelad");
        const token = config.get("githubToken");
        return !!token;
    }
}
exports.GitHubService = GitHubService;
//# sourceMappingURL=GitHubService.js.map