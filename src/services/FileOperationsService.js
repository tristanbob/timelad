const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

/**
 * Service for handling file system operations
 * Centralizes all file and directory operations with proper error handling
 */
class FileOperationsService {
  constructor() {
    // Promisify commonly used fs functions
    this.fsExists = promisify(fs.exists);
    this.fsUnlink = promisify(fs.unlink);
    this.fsReadFile = promisify(fs.readFile);
    this.fsWriteFile = promisify(fs.writeFile);
    this.fsReaddir = promisify(fs.readdir);
    this.fsStat = promisify(fs.stat);
    this.fsMkdir = promisify(fs.mkdir);
    this.fsRmdir = promisify(fs.rmdir);
  }

  /**
   * Check if a file or directory exists
   * @param {string} filePath Path to check
   * @returns {Promise<boolean>} True if exists
   */
  async exists(filePath) {
    try {
      return await this.fsExists(filePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a file or directory exists synchronously
   * @param {string} filePath Path to check
   * @returns {boolean} True if exists
   */
  existsSync(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Read a file's contents
   * @param {string} filePath Path to file
   * @param {string} encoding File encoding (default: 'utf8')
   * @returns {Promise<string>} File contents
   */
  async readFile(filePath, encoding = 'utf8') {
    return await this.fsReadFile(filePath, encoding);
  }

  /**
   * Write content to a file
   * @param {string} filePath Path to file
   * @param {string} content Content to write
   * @param {string} encoding File encoding (default: 'utf8')
   * @returns {Promise<void>}
   */
  async writeFile(filePath, content, encoding = 'utf8') {
    // Ensure directory exists
    const directory = path.dirname(filePath);
    await this.ensureDirectoryExists(directory);
    
    return await this.fsWriteFile(filePath, content, encoding);
  }

  /**
   * Write content to a file synchronously
   * @param {string} filePath Path to file
   * @param {string} content Content to write
   * @param {string} encoding File encoding (default: 'utf8')
   */
  writeFileSync(filePath, content, encoding = 'utf8') {
    // Ensure directory exists
    const directory = path.dirname(filePath);
    this.ensureDirectoryExistsSync(directory);
    
    fs.writeFileSync(filePath, content, encoding);
  }

  /**
   * Delete a file
   * @param {string} filePath Path to file
   * @returns {Promise<boolean>} True if successfully deleted
   */
  async deleteFile(filePath) {
    try {
      if (await this.exists(filePath)) {
        await this.fsUnlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`Failed to delete file ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Delete a file synchronously
   * @param {string} filePath Path to file
   * @returns {boolean} True if successfully deleted
   */
  deleteFileSync(filePath) {
    try {
      if (this.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`Failed to delete file ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Read directory contents
   * @param {string} dirPath Directory path
   * @param {Object} options Options for readdir
   * @returns {Promise<Array>} Directory entries
   */
  async readDirectory(dirPath, options = {}) {
    return await this.fsReaddir(dirPath, {
      withFileTypes: false,
      ...options
    });
  }

  /**
   * Read directory contents with file types
   * @param {string} dirPath Directory path
   * @returns {Promise<Array>} Directory entries with file type info
   */
  async readDirectoryWithTypes(dirPath) {
    return await this.fsReaddir(dirPath, { withFileTypes: true });
  }

  /**
   * Get file/directory stats
   * @param {string} filePath Path to file/directory
   * @returns {Promise<fs.Stats>} File stats
   */
  async getStats(filePath) {
    return await this.fsStat(filePath);
  }

  /**
   * Check if path is a directory
   * @param {string} dirPath Path to check
   * @returns {Promise<boolean>} True if directory
   */
  async isDirectory(dirPath) {
    try {
      const stats = await this.getStats(dirPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if path is a file
   * @param {string} filePath Path to check
   * @returns {Promise<boolean>} True if file
   */
  async isFile(filePath) {
    try {
      const stats = await this.getStats(filePath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure directory exists, create if it doesn't
   * @param {string} dirPath Directory path
   * @returns {Promise<void>}
   */
  async ensureDirectoryExists(dirPath) {
    try {
      if (!(await this.exists(dirPath))) {
        await this.fsMkdir(dirPath, { recursive: true });
      }
    } catch (error) {
      // Ignore error if directory already exists
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Ensure directory exists synchronously
   * @param {string} dirPath Directory path
   */
  ensureDirectoryExistsSync(dirPath) {
    try {
      if (!this.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      // Ignore error if directory already exists
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Create a temporary file path
   * @param {string} directory Directory for temp file
   * @param {string} prefix File prefix
   * @param {string} extension File extension
   * @returns {string} Temporary file path
   */
  createTempFilePath(directory, prefix = 'temp', extension = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `${prefix}-${timestamp}-${random}${extension}`;
    return path.join(directory, fileName);
  }

  /**
   * Clean up temporary files based on pattern
   * @param {string} directory Directory to clean
   * @param {string} pattern Pattern to match (regex string)
   * @param {number} maxAge Maximum age in milliseconds
   * @returns {Promise<number>} Number of files cleaned
   */
  async cleanupTempFiles(directory, pattern, maxAge = 24 * 60 * 60 * 1000) {
    try {
      if (!(await this.exists(directory))) {
        return 0;
      }

      const entries = await this.readDirectoryWithTypes(directory);
      const regex = new RegExp(pattern);
      const cutoffTime = Date.now() - maxAge;
      let cleanedCount = 0;

      for (const entry of entries) {
        if (entry.isFile() && regex.test(entry.name)) {
          const filePath = path.join(directory, entry.name);
          try {
            const stats = await this.getStats(filePath);
            if (stats.mtime.getTime() < cutoffTime) {
              await this.deleteFile(filePath);
              cleanedCount++;
            }
          } catch (error) {
            // Continue with other files if one fails
            console.warn(`Failed to process temp file ${filePath}:`, error.message);
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.warn(`Failed to cleanup temp files in ${directory}:`, error.message);
      return 0;
    }
  }

  /**
   * Safely remove Git lock files
   * @param {string} repoPath Repository path
   * @returns {Promise<boolean>} True if lock file was removed
   */
  async removeGitLockFile(repoPath) {
    const lockFilePath = path.join(repoPath, '.git', 'index.lock');
    return await this.deleteFile(lockFilePath);
  }

  /**
   * Create a temporary commit message file
   * @param {string} repoPath Repository path
   * @param {string} message Commit message
   * @returns {Promise<string>} Path to temp file
   */
  async createTempCommitFile(repoPath, message) {
    const gitDir = path.join(repoPath, '.git');
    const tempFile = this.createTempFilePath(gitDir, 'COMMIT_EDITMSG', '');
    await this.writeFile(tempFile, message);
    return tempFile;
  }

  /**
   * Create a temporary index file
   * @param {string} repoPath Repository path
   * @returns {string} Path to temp index file
   */
  createTempIndexFile(repoPath) {
    const gitDir = path.join(repoPath, '.git');
    return this.createTempFilePath(gitDir, 'index', '');
  }

  /**
   * Join path segments safely
   * @param {...string} segments Path segments
   * @returns {string} Joined path
   */
  joinPath(...segments) {
    return path.join(...segments);
  }

  /**
   * Get base name of a path
   * @param {string} filePath File path
   * @param {string} ext Optional extension to remove
   * @returns {string} Base name
   */
  getBaseName(filePath, ext) {
    return path.basename(filePath, ext);
  }

  /**
   * Get directory name of a path
   * @param {string} filePath File path
   * @returns {string} Directory name
   */
  getDirName(filePath) {
    return path.dirname(filePath);
  }

  /**
   * Get file extension
   * @param {string} filePath File path
   * @returns {string} File extension (including dot)
   */
  getExtension(filePath) {
    return path.extname(filePath);
  }

  /**
   * Normalize a path
   * @param {string} filePath File path
   * @returns {string} Normalized path
   */
  normalizePath(filePath) {
    return path.normalize(filePath);
  }

  /**
   * Resolve a path to absolute
   * @param {...string} segments Path segments
   * @returns {string} Absolute path
   */
  resolvePath(...segments) {
    return path.resolve(...segments);
  }

  /**
   * Check if path is absolute
   * @param {string} filePath File path
   * @returns {boolean} True if absolute
   */
  isAbsolute(filePath) {
    return path.isAbsolute(filePath);
  }

  /**
   * Get relative path between two paths
   * @param {string} from From path
   * @param {string} to To path
   * @returns {string} Relative path
   */
  getRelativePath(from, to) {
    return path.relative(from, to);
  }

  /**
   * Validate that a path is within a parent directory (security check)
   * @param {string} parentDir Parent directory
   * @param {string} childPath Child path to validate
   * @returns {boolean} True if child is within parent
   */
  isPathWithinDirectory(parentDir, childPath) {
    const normalizedParent = this.resolvePath(parentDir);
    const normalizedChild = this.resolvePath(childPath);
    const relative = this.getRelativePath(normalizedParent, normalizedChild);
    
    // If the relative path starts with '..' or is absolute, 
    // the child is outside the parent
    return !relative.startsWith('..') && !this.isAbsolute(relative);
  }
}

module.exports = FileOperationsService;