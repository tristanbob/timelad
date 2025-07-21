"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitMessageService = void 0;
class CommitMessageService {
    constructor() {
        this.messageCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
    async generateCommitMessage(files, summary) {
        const cacheKey = this.createCacheKey(files, summary);
        const cached = this.messageCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.message;
        }
        const message = this.generateRuleBasedCommitMessage(files, summary);
        this.cacheMessage(cacheKey, message);
        return message;
    }
    generateRuleBasedCommitMessage(files, summary) {
        const safeFiles = Array.isArray(files)
            ? files.filter(f => f && typeof f === 'object' && f.fileName && f.type)
            : [];
        if (safeFiles.length === 0) {
            return "chore: update files";
        }
        const fileTypes = new Set();
        const changeTypes = new Set();
        safeFiles.forEach((file) => {
            const fileName = file.fileName || '';
            const ext = fileName.includes('.')
                ? fileName.split(".").pop()?.toLowerCase() || 'unknown'
                : 'unknown';
            fileTypes.add(ext);
            const fileType = file.type || '';
            if (fileType.includes("added"))
                changeTypes.add("add");
            if (fileType.includes("modified"))
                changeTypes.add("update");
            if (fileType.includes("deleted"))
                changeTypes.add("remove");
            if (fileType.includes("renamed"))
                changeTypes.add("rename");
        });
        const commitType = this.determineCommitType(fileTypes);
        const subject = this.generateSubject(safeFiles, changeTypes);
        return `${commitType}: ${subject}`;
    }
    determineCommitType(fileTypes) {
        if (fileTypes.has("js") ||
            fileTypes.has("ts") ||
            fileTypes.has("jsx") ||
            fileTypes.has("tsx") ||
            fileTypes.has("py") ||
            fileTypes.has("java") ||
            fileTypes.has("cpp") ||
            fileTypes.has("c") ||
            fileTypes.has("cs")) {
            return "feat";
        }
        if (fileTypes.has("css") ||
            fileTypes.has("scss") ||
            fileTypes.has("less") ||
            fileTypes.has("sass")) {
            return "style";
        }
        if (fileTypes.has("md") ||
            fileTypes.has("txt") ||
            fileTypes.has("rst") ||
            fileTypes.has("doc") ||
            fileTypes.has("docx")) {
            return "docs";
        }
        if (fileTypes.has("json") ||
            fileTypes.has("yml") ||
            fileTypes.has("yaml") ||
            fileTypes.has("toml") ||
            fileTypes.has("ini") ||
            fileTypes.has("config")) {
            return "config";
        }
        if (fileTypes.has("test") ||
            fileTypes.has("spec") ||
            Array.from(fileTypes).some(ext => ext.includes("test"))) {
            return "test";
        }
        return "chore";
    }
    generateSubject(files, changeTypes) {
        if (files.length === 1) {
            const file = files[0];
            const fileName = file?.fileName?.split("/").pop() || file?.fileName || 'unknown';
            if (changeTypes.has("add")) {
                return `add ${fileName}`;
            }
            else if (changeTypes.has("remove")) {
                return `remove ${fileName}`;
            }
            else if (changeTypes.has("rename")) {
                return `rename ${fileName}`;
            }
            else {
                return `update ${fileName}`;
            }
        }
        else {
            const mainChangeType = this.getMainChangeType(changeTypes);
            return `${mainChangeType} ${files.length} files`;
        }
    }
    getMainChangeType(changeTypes) {
        if (changeTypes.has("add"))
            return "add";
        if (changeTypes.has("update"))
            return "update";
        if (changeTypes.has("remove"))
            return "remove";
        if (changeTypes.has("rename"))
            return "rename";
        return "modify";
    }
    createCacheKey(files, summary) {
        const safeFiles = Array.isArray(files) ? files : [];
        const safeSummary = summary || '';
        const fileSignature = safeFiles
            .filter(f => f && typeof f === 'object' && f.fileName && f.type)
            .map(f => `${f.fileName}:${f.type}`)
            .sort()
            .join("|");
        return `${fileSignature}::${safeSummary}`;
    }
    cacheMessage(key, message) {
        this.messageCache.set(key, {
            message,
            timestamp: Date.now()
        });
        if (this.messageCache.size > 50) {
            const oldestKeys = Array.from(this.messageCache.keys()).slice(0, 10);
            oldestKeys.forEach(key => this.messageCache.delete(key));
        }
    }
    clearCache() {
        this.messageCache.clear();
    }
    getCacheStats() {
        return {
            size: this.messageCache.size,
            timeout: this.cacheTimeout
        };
    }
}
exports.CommitMessageService = CommitMessageService;
//# sourceMappingURL=CommitMessageService.js.map