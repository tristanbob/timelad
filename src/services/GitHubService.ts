import * as vscode from 'vscode';
import * as https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitHubServiceInterface } from '../types';

const execPromise = promisify(exec);

interface GitHubRequestOptions {
    hostname: string;
    path: string;
    method: string;
    headers: Record<string, string>;
}

interface GitHubRepository {
    name: string;
    fullName: string;
    description: string;
    cloneUrl: string;
    isPrivate: boolean;
    updatedAt: string;
    language: string | null;
}

interface CreateRepositoryData {
    name: string;
    description: string;
    private: boolean;
    auto_init: boolean;
}

interface GitHubUser {
    login: string;
    id: number;
    name: string | null;
    email: string | null;
    [key: string]: any;
}

interface GitHubApiError {
    message: string;
    documentation_url?: string;
    errors?: any[];
}

export class GitHubService implements GitHubServiceInterface {
    private baseURL: string;

    constructor() {
        this.baseURL = "https://api.github.com";
    }

    async getGitHubToken(): Promise<string> {
        const config = vscode.workspace.getConfiguration("timelad");
        let token = config.get<string>("githubToken");

        if (!token) {
            token = await vscode.window.showInputBox({
                prompt: "Enter your GitHub Personal Access Token",
                placeHolder: "ghp_xxxxxxxxxxxxxxxxxxxx",
                password: true,
                ignoreFocusOut: true,
                validateInput: (value: string) => {
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
                await config.update(
                    "githubToken",
                    token,
                    vscode.ConfigurationTarget.Global
                );
            }
        }

        return token;
    }

    private async makeGitHubRequest<T = any>(
        endpoint: string, 
        method: string = "GET", 
        data: any = null
    ): Promise<T> {
        const token = await this.getGitHubToken();

        return new Promise((resolve, reject) => {
            const options: GitHubRequestOptions = {
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
                        } else {
                            const error = parsedData as GitHubApiError;
                            reject(
                                new Error(
                                    `GitHub API Error: ${error.message || "Unknown error"}`
                                )
                            );
                        }
                    } catch (error) {
                        reject(
                            new Error(`Failed to parse GitHub API response: ${(error as Error).message}`)
                        );
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

    async getUser(): Promise<GitHubUser> {
        return await this.makeGitHubRequest<GitHubUser>("/user");
    }

    async repositoryExists(owner: string, repo: string): Promise<boolean> {
        try {
            await this.makeGitHubRequest(`/repos/${owner}/${repo}`);
            return true;
        } catch (error) {
            if ((error as Error).message.includes("Not Found")) {
                return false;
            }
            throw error;
        }
    }

    async createRepository(
        name: string, 
        description: string = "", 
        isPrivate: boolean = false
    ): Promise<any> {
        const data: CreateRepositoryData = {
            name: name,
            description: description,
            private: isPrivate,
            auto_init: false,
        };

        return await this.makeGitHubRequest("/user/repos", "POST", data);
    }

    async addRemoteAndPush(repoPath: string, remoteUrl: string): Promise<void> {
        try {
            try {
                await execPromise("git remote get-url origin", { cwd: repoPath });
                await execPromise(`git remote set-url origin ${remoteUrl}`, {
                    cwd: repoPath,
                });
            } catch (error) {
                await execPromise(`git remote add origin ${remoteUrl}`, {
                    cwd: repoPath,
                });
            }

            await execPromise("git push -u origin main", { cwd: repoPath });
        } catch (error) {
            try {
                await execPromise("git push -u origin master", { cwd: repoPath });
            } catch (masterError) {
                throw new Error(`Failed to push to GitHub: ${(error as Error).message}`);
            }
        }
    }

    async getUserRepositories(limit: number = 100): Promise<GitHubRepository[]> {
        const repos = await this.makeGitHubRequest<any[]>(
            `/user/repos?per_page=${limit}&sort=updated`
        );
        
        return repos.map((repo): GitHubRepository => ({
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description || "No description",
            cloneUrl: repo.clone_url,
            isPrivate: repo.private,
            updatedAt: repo.updated_at,
            language: repo.language,
        }));
    }

    async cloneRepository(cloneUrl: string, targetPath: string): Promise<void> {
        try {
            await execPromise(`git clone "${cloneUrl}" "${targetPath}"`);
        } catch (error) {
            throw new Error(`Failed to clone repository: ${(error as Error).message}`);
        }
    }

    // Legacy interface methods for backward compatibility
    async saveToGitHub(content: string, filename: string): Promise<boolean> {
        // This would need to be implemented based on specific requirements
        // For now, returning false to maintain interface compatibility
        return false;
    }

    async loadFromGitHub(filename: string): Promise<string> {
        // This would need to be implemented based on specific requirements
        // For now, returning empty string to maintain interface compatibility
        return "";
    }

    isAuthenticated(): boolean {
        const config = vscode.workspace.getConfiguration("timelad");
        const token = config.get<string>("githubToken");
        return !!token;
    }
}