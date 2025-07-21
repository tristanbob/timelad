import { CommitMessageServiceInterface } from '../types';
interface FileChange {
    fileName: string;
    type: string;
}
interface CacheStats {
    size: number;
    timeout: number;
}
export declare class CommitMessageService implements CommitMessageServiceInterface {
    private messageCache;
    private cacheTimeout;
    constructor();
    generateCommitMessage(files: FileChange[], summary: string): Promise<string>;
    private generateRuleBasedCommitMessage;
    private determineCommitType;
    private generateSubject;
    private getMainChangeType;
    private createCacheKey;
    private cacheMessage;
    clearCache(): void;
    getCacheStats(): CacheStats;
}
export {};
//# sourceMappingURL=CommitMessageService.d.ts.map