const vscode = require("vscode");

/**
 * Service for generating AI-powered commit messages
 * Handles VSCode AI integration and fallback logic
 */
class AICommitMessageService {
  constructor() {
    // Cache for AI responses to avoid repeated calls for same changes
    this.messageCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate a commit message for the given changes
   * @param {Array} files Array of changed files with metadata
   * @param {string} summary Git diff summary
   * @returns {Promise<string>} Generated commit message
   */
  async generateCommitMessage(files, summary) {
    // Create cache key from file changes
    const cacheKey = this.createCacheKey(files, summary);
    
    // Check cache first
    const cached = this.messageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.message;
    }

    let message;
    try {
      // Try VSCode AI first
      message = await this.tryVSCodeAI(files, summary);
      if (message) {
        this.cacheMessage(cacheKey, message);
        return message;
      }
    } catch (error) {
      console.log("VSCode AI not available, using fallback:", error.message);
    }

    // Fallback to rule-based generation
    message = this.generateFallbackCommitMessage(files, summary);
    this.cacheMessage(cacheKey, message);
    return message;
  }

  /**
   * Try to use VSCode's built-in AI for commit message generation
   * @param {Array} files Array of changed files
   * @param {string} summary Git diff summary
   * @returns {Promise<string|null>} AI generated message or null
   */
  async tryVSCodeAI(files, summary) {
    try {
      // Check if GitHub Copilot extension is available and active
      const copilotExtension = vscode.extensions.getExtension("GitHub.copilot");

      if (!copilotExtension || !copilotExtension.isActive) {
        return null;
      }

      // Try to access Copilot's API
      const copilotApi = copilotExtension.exports;

      if (!copilotApi || !copilotApi.generateCommitMessage) {
        return null;
      }

      // Use Copilot to generate commit message
      const prompt = this.buildCommitPrompt(files, summary);
      const aiResponse = await copilotApi.generateCommitMessage(prompt);

      return aiResponse ? aiResponse.trim() : null;
    } catch (error) {
      console.log("Failed to use VSCode AI:", error);
      return null;
    }
  }

  /**
   * Generate fallback commit message using rule-based approach
   * @param {Array} files Array of changed files
   * @param {string} summary Git diff summary
   * @returns {string} Generated commit message
   */
  generateFallbackCommitMessage(files, summary) {
    if (files.length === 0) {
      return "chore: update files";
    }

    // Analyze file types and changes
    const fileTypes = new Set();
    const changeTypes = new Set();

    files.forEach((file) => {
      // Extract file extension
      const ext = file.fileName.split(".").pop().toLowerCase();
      fileTypes.add(ext);

      // Track change types
      if (file.type.includes("added")) changeTypes.add("add");
      if (file.type.includes("modified")) changeTypes.add("update");
      if (file.type.includes("deleted")) changeTypes.add("remove");
      if (file.type.includes("renamed")) changeTypes.add("rename");
    });

    // Determine commit type based on files and changes
    let commitType = this.determineCommitType(fileTypes);
    let subject = this.generateSubject(files, changeTypes);

    return `${commitType}: ${subject}`;
  }

  /**
   * Determine commit type based on file extensions
   * @param {Set} fileTypes Set of file extensions
   * @returns {string} Commit type (feat, style, docs, etc.)
   */
  determineCommitType(fileTypes) {
    if (
      fileTypes.has("js") ||
      fileTypes.has("ts") ||
      fileTypes.has("jsx") ||
      fileTypes.has("tsx") ||
      fileTypes.has("py") ||
      fileTypes.has("java") ||
      fileTypes.has("cpp") ||
      fileTypes.has("c") ||
      fileTypes.has("cs")
    ) {
      return "feat";
    }
    
    if (
      fileTypes.has("css") ||
      fileTypes.has("scss") ||
      fileTypes.has("less") ||
      fileTypes.has("sass")
    ) {
      return "style";
    }
    
    if (
      fileTypes.has("md") || 
      fileTypes.has("txt") || 
      fileTypes.has("rst") ||
      fileTypes.has("doc") ||
      fileTypes.has("docx")
    ) {
      return "docs";
    }
    
    if (
      fileTypes.has("json") ||
      fileTypes.has("yml") ||
      fileTypes.has("yaml") ||
      fileTypes.has("toml") ||
      fileTypes.has("ini") ||
      fileTypes.has("config")
    ) {
      return "config";
    }

    if (
      fileTypes.has("test") ||
      fileTypes.has("spec") ||
      Array.from(fileTypes).some(ext => ext.includes("test"))
    ) {
      return "test";
    }

    return "chore";
  }

  /**
   * Generate commit subject based on changes
   * @param {Array} files Array of changed files
   * @param {Set} changeTypes Set of change types
   * @returns {string} Commit subject
   */
  generateSubject(files, changeTypes) {
    if (files.length === 1) {
      const file = files[0];
      const fileName = file.fileName.split("/").pop();

      if (changeTypes.has("add")) {
        return `add ${fileName}`;
      } else if (changeTypes.has("remove")) {
        return `remove ${fileName}`;
      } else if (changeTypes.has("rename")) {
        return `rename ${fileName}`;
      } else {
        return `update ${fileName}`;
      }
    } else {
      const mainChangeType = this.getMainChangeType(changeTypes);
      return `${mainChangeType} ${files.length} files`;
    }
  }

  /**
   * Get the primary change type from a set of changes
   * @param {Set} changeTypes Set of change types
   * @returns {string} Main change type
   */
  getMainChangeType(changeTypes) {
    if (changeTypes.has("add")) return "add";
    if (changeTypes.has("update")) return "update";
    if (changeTypes.has("remove")) return "remove";
    if (changeTypes.has("rename")) return "rename";
    return "modify";
  }

  /**
   * Build prompt for AI commit message generation
   * @param {Array} files Array of changed files
   * @param {string} summary Git diff summary
   * @returns {string} Formatted prompt
   */
  buildCommitPrompt(files, summary) {
    const fileList = files.map((f) => `${f.type}: ${f.fileName}`).join("\n");

    return `Generate a concise git commit message for the following changes:

Files changed:
${fileList}

Summary:
${summary}

Please provide a clear, conventional commit message (50 chars or less for the subject line).`;
  }

  /**
   * Create a cache key from file changes
   * @param {Array} files Array of changed files
   * @param {string} summary Git diff summary
   * @returns {string} Cache key
   */
  createCacheKey(files, summary) {
    const fileSignature = files
      .map(f => `${f.fileName}:${f.type}`)
      .sort()
      .join("|");
    return `${fileSignature}::${summary}`;
  }

  /**
   * Cache a generated commit message
   * @param {string} key Cache key
   * @param {string} message Commit message
   */
  cacheMessage(key, message) {
    this.messageCache.set(key, {
      message,
      timestamp: Date.now()
    });

    // Clean up old cache entries (keep cache size reasonable)
    if (this.messageCache.size > 50) {
      const oldestKeys = Array.from(this.messageCache.keys()).slice(0, 10);
      oldestKeys.forEach(key => this.messageCache.delete(key));
    }
  }

  /**
   * Clear the message cache
   */
  clearCache() {
    this.messageCache.clear();
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.messageCache.size,
      timeout: this.cacheTimeout
    };
  }
}

module.exports = AICommitMessageService;