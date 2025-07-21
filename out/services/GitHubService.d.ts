import { GitHubServiceInterface } from '../types';
interface GitHubRepository {
    name: string;
    fullName: string;
    description: string;
    cloneUrl: string;
    isPrivate: boolean;
    updatedAt: string;
    language: string | null;
}
interface GitHubUser {
    login: string;
    id: number;
    name: string | null;
    email: string | null;
    [key: string]: any;
}
export declare class GitHubService implements GitHubServiceInterface {
    private baseURL;
    constructor();
    getGitHubToken(): Promise<string>;
    private makeGitHubRequest;
    getUser(): Promise<GitHubUser>;
    repositoryExists(owner: string, repo: string): Promise<boolean>;
    createRepository(name: string, description?: string, isPrivate?: boolean): Promise<any>;
    addRemoteAndPush(repoPath: string, remoteUrl: string): Promise<void>;
    getUserRepositories(limit?: number): Promise<GitHubRepository[]>;
    cloneRepository(cloneUrl: string, targetPath: string): Promise<void>;
    saveToGitHub(content: string, filename: string): Promise<boolean>;
    loadFromGitHub(filename: string): Promise<string>;
    isAuthenticated(): boolean;
}
export {};
//# sourceMappingURL=GitHubService.d.ts.map