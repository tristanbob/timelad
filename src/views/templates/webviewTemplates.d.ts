// Type declarations for webviewTemplates.js module

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  subject?: string;
  version?: number;
}

export interface UncommittedChanges {
  hasChanges: boolean;
  files: Array<{
    fileName: string;
    status: string;
    type?: string;
  }>;
  summary?: string;
}

export interface PaginationInfo {
  hasMore: boolean;
  totalCount: number;
  showingCount: number;
}

export interface CommitData {
  hash: string;
  author: string;
  date: string;
  subject: string;
  version: number;
}

export function getLoadingTemplate(message?: string): string;

export function getSidebarTemplate(
  commits: CommitData[], 
  uncommittedChanges: UncommittedChanges | null, 
  paginationInfo?: PaginationInfo
): string;

export function getCommitHistoryTemplate(
  commits: GitCommit[], 
  uncommittedChanges?: UncommittedChanges
): string;

export function getCommitDetailsTemplate(
  commit: GitCommit, 
  commitDetails: string
): string;