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
exports.FileOperationsService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
/**
 * Service for handling file system operations
 * Centralizes all file and directory operations with proper error handling
 */
class FileOperationsService {
    constructor() {
        // Promisify commonly used fs functions with proper type casting
        this.fsExists = (0, util_1.promisify)(fs.exists);
        this.fsUnlink = (0, util_1.promisify)(fs.unlink);
        this.fsReadFile = ((path, encoding) => {
            return (0, util_1.promisify)(fs.readFile)(path, encoding || 'utf8');
        });
        this.fsWriteFile = (0, util_1.promisify)(fs.writeFile);
        this.fsReaddir = (0, util_1.promisify)(fs.readdir);
        this.fsStat = (0, util_1.promisify)(fs.stat);
        this.fsMkdir = (0, util_1.promisify)(fs.mkdir);
        this.fsRmdir = (0, util_1.promisify)(fs.rmdir);
    }
    /**
     * Check if a file or directory exists
     */
    async exists(filePath) {
        try {
            return await this.fsExists(filePath);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if a file or directory exists (alias for interface compatibility)
     */
    async fileExists(filePath) {
        return await this.exists(filePath);
    }
    /**
     * Check if a file or directory exists synchronously
     */
    existsSync(filePath) {
        try {
            return fs.existsSync(filePath);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Read a file's contents
     */
    async readFile(filePath, encoding = 'utf8') {
        try {
            return await this.fsReadFile(filePath, encoding);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${filePath}`);
            }
            throw error;
        }
    }
    /**
     * Write content to a file
     */
    async writeFile(filePath, content, encoding = 'utf8') {
        // Ensure directory exists
        const directory = path.dirname(filePath);
        await this.ensureDirectoryExists(directory);
        return await this.fsWriteFile(filePath, content, encoding);
    }
    /**
     * Write content to a file synchronously
     */
    writeFileSync(filePath, content, encoding = 'utf8') {
        // Ensure directory exists
        const directory = path.dirname(filePath);
        this.ensureDirectoryExistsSync(directory);
        fs.writeFileSync(filePath, content, encoding);
    }
    /**
     * Delete a file
     */
    async deleteFile(filePath) {
        try {
            if (await this.exists(filePath)) {
                await this.fsUnlink(filePath);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to delete file ${filePath}:`, errorMessage);
            throw error;
        }
    }
    /**
     * Delete a file synchronously
     */
    deleteFileSync(filePath) {
        try {
            if (this.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to delete file ${filePath}:`, errorMessage);
            return false;
        }
    }
    /**
     * Read directory contents
     */
    async readDirectory(dirPath, options = {}) {
        const result = await this.fsReaddir(dirPath, {
            withFileTypes: false,
            ...options
        });
        return result;
    }
    /**
     * Read directory contents with file types
     */
    async readDirectoryWithTypes(dirPath) {
        const result = await this.fsReaddir(dirPath, { withFileTypes: true });
        return result;
    }
    /**
     * Get file/directory stats
     */
    async getStats(filePath) {
        return await this.fsStat(filePath);
    }
    /**
     * Check if path is a directory
     */
    async isDirectory(dirPath) {
        try {
            const stats = await this.getStats(dirPath);
            return stats.isDirectory();
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if path is a file
     */
    async isFile(filePath) {
        try {
            const stats = await this.getStats(filePath);
            return stats.isFile();
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Ensure directory exists, create if it doesn't
     */
    async ensureDirectoryExists(dirPath) {
        try {
            if (!(await this.exists(dirPath))) {
                await this.fsMkdir(dirPath, { recursive: true });
            }
        }
        catch (error) {
            // Ignore error if directory already exists
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    /**
     * Create directory (alias for interface compatibility)
     */
    async createDirectory(dirPath) {
        await this.ensureDirectoryExists(dirPath);
    }
    /**
     * Create directory synchronously (for mkdir signature compatibility)
     */
    async mkdir(dirPath, options) {
        try {
            await this.fsMkdir(dirPath, options || { recursive: true });
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    /**
     * Ensure directory exists synchronously
     */
    ensureDirectoryExistsSync(dirPath) {
        try {
            if (!this.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        }
        catch (error) {
            // Ignore error if directory already exists
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    /**
     * Create a temporary file path
     */
    createTempFilePath(directory, prefix = 'temp', extension = '') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const fileName = `${prefix}-${timestamp}-${random}${extension}`;
        return path.join(directory, fileName);
    }
    /**
     * Clean up temporary files based on pattern
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
                    }
                    catch (error) {
                        // Continue with other files if one fails
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.warn(`Failed to process temp file ${filePath}:`, errorMessage);
                    }
                }
            }
            return cleanedCount;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to cleanup temp files in ${directory}:`, errorMessage);
            return 0;
        }
    }
    /**
     * Safely remove Git lock files
     */
    async removeGitLockFile(repoPath) {
        const lockFilePath = path.join(repoPath, '.git', 'index.lock');
        try {
            await this.deleteFile(lockFilePath);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Create a temporary commit message file
     */
    async createTempCommitFile(repoPath, message) {
        const gitDir = path.join(repoPath, '.git');
        const tempFile = this.createTempFilePath(gitDir, 'COMMIT_EDITMSG', '');
        await this.writeFile(tempFile, message);
        return tempFile;
    }
    /**
     * Join path segments safely
     */
    joinPath(...segments) {
        return path.join(...segments);
    }
    /**
     * Get base name of a path
     */
    getBaseName(filePath, ext) {
        return path.basename(filePath, ext);
    }
    /**
     * Get directory name of a path
     */
    getDirName(filePath) {
        return path.dirname(filePath);
    }
    /**
     * Get file extension
     */
    getExtension(filePath) {
        return path.extname(filePath);
    }
    /**
     * Normalize a path
     */
    normalizePath(filePath) {
        return path.normalize(filePath);
    }
    /**
     * Resolve a path to absolute
     */
    resolvePath(...segments) {
        return path.resolve(...segments);
    }
    /**
     * Check if path is absolute
     */
    isAbsolute(filePath) {
        return path.isAbsolute(filePath);
    }
    /**
     * Get relative path between two paths
     */
    getRelativePath(from, to) {
        return path.relative(from, to);
    }
    /**
     * Validate that a path is within a parent directory (security check)
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
exports.FileOperationsService = FileOperationsService;
//# sourceMappingURL=FileOperationsService.js.map