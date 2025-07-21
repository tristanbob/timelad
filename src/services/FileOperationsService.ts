import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { FileOperationsServiceInterface } from '../types';

/**
 * Service for handling file system operations
 * Centralizes all file and directory operations with proper error handling
 */
export class FileOperationsService implements FileOperationsServiceInterface {
    private readonly fsExists: (path: string) => Promise<boolean>;
    private readonly fsUnlink: (path: string) => Promise<void>;
    private readonly fsReadFile: (path: string, encoding?: BufferEncoding) => Promise<string>;
    private readonly fsWriteFile: (path: string, data: string, encoding?: BufferEncoding) => Promise<void>;
    private readonly fsReaddir: (path: string, options?: any) => Promise<string[] | fs.Dirent[]>;
    private readonly fsStat: (path: string) => Promise<fs.Stats>;
    private readonly fsMkdir: (path: string, options?: fs.MakeDirectoryOptions) => Promise<void>;
    private readonly fsRmdir: (path: string) => Promise<void>;

    constructor() {
        // Promisify commonly used fs functions with proper type casting
        this.fsExists = promisify(fs.exists);
        this.fsUnlink = promisify(fs.unlink);
        this.fsReadFile = ((path: string, encoding?: BufferEncoding) => {
            return promisify(fs.readFile)(path, encoding || 'utf8') as Promise<string>;
        });
        this.fsWriteFile = promisify(fs.writeFile) as (path: string, data: string, encoding?: BufferEncoding) => Promise<void>;
        this.fsReaddir = promisify(fs.readdir);
        this.fsStat = promisify(fs.stat);
        this.fsMkdir = promisify(fs.mkdir) as (path: string, options?: fs.MakeDirectoryOptions) => Promise<void>;
        this.fsRmdir = promisify(fs.rmdir);
    }

    /**
     * Check if a file or directory exists
     */
    async exists(filePath: string): Promise<boolean> {
        try {
            return await this.fsExists(filePath);
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if a file or directory exists (alias for interface compatibility)
     */
    async fileExists(filePath: string): Promise<boolean> {
        return await this.exists(filePath);
    }

    /**
     * Check if a file or directory exists synchronously
     */
    existsSync(filePath: string): boolean {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            return false;
        }
    }

    /**
     * Read a file's contents
     */
    async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
        try {
            return await this.fsReadFile(filePath, encoding);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${filePath}`);
            }
            throw error;
        }
    }

    /**
     * Write content to a file
     */
    async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
        // Ensure directory exists
        const directory = path.dirname(filePath);
        await this.ensureDirectoryExists(directory);
        
        return await this.fsWriteFile(filePath, content, encoding);
    }

    /**
     * Write content to a file synchronously
     */
    writeFileSync(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): void {
        // Ensure directory exists
        const directory = path.dirname(filePath);
        this.ensureDirectoryExistsSync(directory);
        
        fs.writeFileSync(filePath, content, encoding);
    }

    /**
     * Delete a file
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            if (await this.exists(filePath)) {
                await this.fsUnlink(filePath);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to delete file ${filePath}:`, errorMessage);
            throw error;
        }
    }

    /**
     * Delete a file synchronously
     */
    deleteFileSync(filePath: string): boolean {
        try {
            if (this.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to delete file ${filePath}:`, errorMessage);
            return false;
        }
    }

    /**
     * Read directory contents
     */
    async readDirectory(dirPath: string, options: any = {}): Promise<string[]> {
        const result = await this.fsReaddir(dirPath, {
            withFileTypes: false,
            ...options
        });
        return result as string[];
    }

    /**
     * Read directory contents with file types
     */
    async readDirectoryWithTypes(dirPath: string): Promise<fs.Dirent[]> {
        const result = await this.fsReaddir(dirPath, { withFileTypes: true });
        return result as fs.Dirent[];
    }

    /**
     * Get file/directory stats
     */
    async getStats(filePath: string): Promise<fs.Stats> {
        return await this.fsStat(filePath);
    }

    /**
     * Check if path is a directory
     */
    async isDirectory(dirPath: string): Promise<boolean> {
        try {
            const stats = await this.getStats(dirPath);
            return stats.isDirectory();
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if path is a file
     */
    async isFile(filePath: string): Promise<boolean> {
        try {
            const stats = await this.getStats(filePath);
            return stats.isFile();
        } catch (error) {
            return false;
        }
    }

    /**
     * Ensure directory exists, create if it doesn't
     */
    async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            if (!(await this.exists(dirPath))) {
                await this.fsMkdir(dirPath, { recursive: true });
            }
        } catch (error: any) {
            // Ignore error if directory already exists
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Create directory (alias for interface compatibility)
     */
    async createDirectory(dirPath: string): Promise<void> {
        await this.ensureDirectoryExists(dirPath);
    }

    /**
     * Create directory synchronously (for mkdir signature compatibility)
     */
    async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
        try {
            await this.fsMkdir(dirPath, options || { recursive: true });
        } catch (error: any) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Ensure directory exists synchronously
     */
    ensureDirectoryExistsSync(dirPath: string): void {
        try {
            if (!this.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        } catch (error: any) {
            // Ignore error if directory already exists
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Create a temporary file path
     */
    createTempFilePath(directory: string, prefix: string = 'temp', extension: string = ''): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const fileName = `${prefix}-${timestamp}-${random}${extension}`;
        return path.join(directory, fileName);
    }

    /**
     * Clean up temporary files based on pattern
     */
    async cleanupTempFiles(directory: string, pattern: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
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
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.warn(`Failed to process temp file ${filePath}:`, errorMessage);
                    }
                }
            }

            return cleanedCount;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to cleanup temp files in ${directory}:`, errorMessage);
            return 0;
        }
    }

    /**
     * Safely remove Git lock files
     */
    async removeGitLockFile(repoPath: string): Promise<boolean> {
        const lockFilePath = path.join(repoPath, '.git', 'index.lock');
        try {
            await this.deleteFile(lockFilePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Create a temporary commit message file
     */
    async createTempCommitFile(repoPath: string, message: string): Promise<string> {
        const gitDir = path.join(repoPath, '.git');
        const tempFile = this.createTempFilePath(gitDir, 'COMMIT_EDITMSG', '');
        await this.writeFile(tempFile, message);
        return tempFile;
    }

    /**
     * Join path segments safely
     */
    joinPath(...segments: string[]): string {
        return path.join(...segments);
    }

    /**
     * Get base name of a path
     */
    getBaseName(filePath: string, ext?: string): string {
        return path.basename(filePath, ext);
    }

    /**
     * Get directory name of a path
     */
    getDirName(filePath: string): string {
        return path.dirname(filePath);
    }

    /**
     * Get file extension
     */
    getExtension(filePath: string): string {
        return path.extname(filePath);
    }

    /**
     * Normalize a path
     */
    normalizePath(filePath: string): string {
        return path.normalize(filePath);
    }

    /**
     * Resolve a path to absolute
     */
    resolvePath(...segments: string[]): string {
        return path.resolve(...segments);
    }

    /**
     * Check if path is absolute
     */
    isAbsolute(filePath: string): boolean {
        return path.isAbsolute(filePath);
    }

    /**
     * Get relative path between two paths
     */
    getRelativePath(from: string, to: string): string {
        return path.relative(from, to);
    }

    /**
     * Validate that a path is within a parent directory (security check)
     */
    isPathWithinDirectory(parentDir: string, childPath: string): boolean {
        const normalizedParent = this.resolvePath(parentDir);
        const normalizedChild = this.resolvePath(childPath);
        const relative = this.getRelativePath(normalizedParent, normalizedChild);
        
        // If the relative path starts with '..' or is absolute, 
        // the child is outside the parent
        return !relative.startsWith('..') && !this.isAbsolute(relative);
    }
}