/// <reference types="node" />
/// <reference types="node" />
import * as fs from 'fs';
import { FileOperationsServiceInterface } from '../types';
/**
 * Service for handling file system operations
 * Centralizes all file and directory operations with proper error handling
 */
export declare class FileOperationsService implements FileOperationsServiceInterface {
    private readonly fsExists;
    private readonly fsUnlink;
    private readonly fsReadFile;
    private readonly fsWriteFile;
    private readonly fsReaddir;
    private readonly fsStat;
    private readonly fsMkdir;
    private readonly fsRmdir;
    constructor();
    /**
     * Check if a file or directory exists
     */
    exists(filePath: string): Promise<boolean>;
    /**
     * Check if a file or directory exists (alias for interface compatibility)
     */
    fileExists(filePath: string): Promise<boolean>;
    /**
     * Check if a file or directory exists synchronously
     */
    existsSync(filePath: string): boolean;
    /**
     * Read a file's contents
     */
    readFile(filePath: string, encoding?: BufferEncoding): Promise<string>;
    /**
     * Write content to a file
     */
    writeFile(filePath: string, content: string, encoding?: BufferEncoding): Promise<void>;
    /**
     * Write content to a file synchronously
     */
    writeFileSync(filePath: string, content: string, encoding?: BufferEncoding): void;
    /**
     * Delete a file
     */
    deleteFile(filePath: string): Promise<void>;
    /**
     * Delete a file synchronously
     */
    deleteFileSync(filePath: string): boolean;
    /**
     * Read directory contents
     */
    readDirectory(dirPath: string, options?: any): Promise<string[]>;
    /**
     * Read directory contents with file types
     */
    readDirectoryWithTypes(dirPath: string): Promise<fs.Dirent[]>;
    /**
     * Get file/directory stats
     */
    getStats(filePath: string): Promise<fs.Stats>;
    /**
     * Check if path is a directory
     */
    isDirectory(dirPath: string): Promise<boolean>;
    /**
     * Check if path is a file
     */
    isFile(filePath: string): Promise<boolean>;
    /**
     * Ensure directory exists, create if it doesn't
     */
    ensureDirectoryExists(dirPath: string): Promise<void>;
    /**
     * Create directory (alias for interface compatibility)
     */
    createDirectory(dirPath: string): Promise<void>;
    /**
     * Create directory synchronously (for mkdir signature compatibility)
     */
    mkdir(dirPath: string, options?: {
        recursive?: boolean;
    }): Promise<void>;
    /**
     * Ensure directory exists synchronously
     */
    ensureDirectoryExistsSync(dirPath: string): void;
    /**
     * Create a temporary file path
     */
    createTempFilePath(directory: string, prefix?: string, extension?: string): string;
    /**
     * Clean up temporary files based on pattern
     */
    cleanupTempFiles(directory: string, pattern: string, maxAge?: number): Promise<number>;
    /**
     * Safely remove Git lock files
     */
    removeGitLockFile(repoPath: string): Promise<boolean>;
    /**
     * Create a temporary commit message file
     */
    createTempCommitFile(repoPath: string, message: string): Promise<string>;
    /**
     * Join path segments safely
     */
    joinPath(...segments: string[]): string;
    /**
     * Get base name of a path
     */
    getBaseName(filePath: string, ext?: string): string;
    /**
     * Get directory name of a path
     */
    getDirName(filePath: string): string;
    /**
     * Get file extension
     */
    getExtension(filePath: string): string;
    /**
     * Normalize a path
     */
    normalizePath(filePath: string): string;
    /**
     * Resolve a path to absolute
     */
    resolvePath(...segments: string[]): string;
    /**
     * Check if path is absolute
     */
    isAbsolute(filePath: string): boolean;
    /**
     * Get relative path between two paths
     */
    getRelativePath(from: string, to: string): string;
    /**
     * Validate that a path is within a parent directory (security check)
     */
    isPathWithinDirectory(parentDir: string, childPath: string): boolean;
}
//# sourceMappingURL=FileOperationsService.d.ts.map