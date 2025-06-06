const vscode = require("vscode");
const https = require("https");
const { exec } = require("child_process");
const util = require("util");
const constants = require("../constants");

const execPromise = util.promisify(exec);

/**
 * Service class for GitHub operations
 */
class GitHubService {
  constructor() {
    this.baseURL = "https://api.github.com";
  }

  /**
   * Get GitHub personal access token from VS Code settings or prompt user
   * @returns {Promise<string>} GitHub token
   */
  async getGitHubToken() {
    const config = vscode.workspace.getConfiguration("timelad");
    let token = config.get("githubToken");

    if (!token) {
      // Prompt user for token
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

      // Ask if user wants to save the token
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

  /**
   * Make HTTP request to GitHub API
   * @param {string} endpoint API endpoint
   * @param {string} method HTTP method
   * @param {Object} data Request body data
   * @returns {Promise<Object>} API response
   */
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
        options.headers["Content-Length"] = Buffer.byteLength(jsonData);
      }

      const req = https.request(options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          try {
            const parsedData = JSON.parse(responseData);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsedData);
            } else {
              reject(
                new Error(
                  `GitHub API Error: ${parsedData.message || "Unknown error"}`
                )
              );
            }
          } catch (error) {
            reject(
              new Error(`Failed to parse GitHub API response: ${error.message}`)
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

  /**
   * Get GitHub user information
   * @returns {Promise<Object>} User information
   */
  async getUser() {
    return await this.makeGitHubRequest("/user");
  }

  /**
   * Check if repository exists on GitHub
   * @param {string} owner Repository owner
   * @param {string} repo Repository name
   * @returns {Promise<boolean>} True if repository exists
   */
  async repositoryExists(owner, repo) {
    try {
      await this.makeGitHubRequest(`/repos/${owner}/${repo}`);
      return true;
    } catch (error) {
      if (error.message.includes("Not Found")) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create a new GitHub repository
   * @param {string} name Repository name
   * @param {string} description Repository description
   * @param {boolean} isPrivate Whether repository should be private
   * @returns {Promise<Object>} Created repository information
   */
  async createRepository(name, description = "", isPrivate = false) {
    const data = {
      name: name,
      description: description,
      private: isPrivate,
      auto_init: false, // Don't initialize with README since we have local content
    };

    return await this.makeGitHubRequest("/user/repos", "POST", data);
  }

  /**
   * Execute git command to add remote and push
   * @param {string} repoPath Local repository path
   * @param {string} remoteUrl GitHub repository URL
   * @returns {Promise<void>}
   */
  async addRemoteAndPush(repoPath, remoteUrl) {
    try {
      // Check if origin remote already exists
      try {
        await execPromise("git remote get-url origin", { cwd: repoPath });
        // If we get here, origin exists, so update it
        await execPromise(`git remote set-url origin ${remoteUrl}`, {
          cwd: repoPath,
        });
      } catch (error) {
        // Origin doesn't exist, add it
        await execPromise(`git remote add origin ${remoteUrl}`, {
          cwd: repoPath,
        });
      }

      // Push to GitHub
      await execPromise("git push -u origin main", { cwd: repoPath });
    } catch (error) {
      // Try with master branch if main doesn't exist
      try {
        await execPromise("git push -u origin master", { cwd: repoPath });
      } catch (masterError) {
        throw new Error(`Failed to push to GitHub: ${error.message}`);
      }
    }
  }

  /**
   * Get current branch name
   * @param {string} repoPath Repository path
   * @returns {Promise<string>} Current branch name
   */
  async getCurrentBranch(repoPath) {
    try {
      const { stdout } = await execPromise("git branch --show-current", {
        cwd: repoPath,
      });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error.message}`);
    }
  }

  /**
   * Get user's repositories from GitHub
   * @param {number} limit Maximum number of repositories to fetch
   * @returns {Promise<Array>} Array of repository objects
   */
  async getUserRepositories(limit = 100) {
    const repos = await this.makeGitHubRequest(
      `/user/repos?per_page=${limit}&sort=updated`
    );
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

  /**
   * Clone a repository from GitHub
   * @param {string} cloneUrl Repository clone URL
   * @param {string} targetPath Target directory path
   * @returns {Promise<void>}
   */
  async cloneRepository(cloneUrl, targetPath) {
    try {
      await execPromise(`git clone "${cloneUrl}" "${targetPath}"`);
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }
}

module.exports = GitHubService;
