/**
 * Comprehensive tests for GitCommands
 * Testing command handlers with real inputs and scenarios
 */

const assert = require("assert");
const sinon = require("sinon");
// Mocha functions are provided globally by VS Code test framework
const TestUtils = require("./testUtils");
const VSCodeMock = require("./vscode-mock");

let vscodeMock;

const { GitCommands } = require("../../out/commands/gitCommands");

describe("GitCommands", () => {
  let gitCommands;
  let testUtils;
  let mockGitService;
  let mockNotificationService;

  beforeEach(() => {
    // Set up centralized VS Code mock
    vscodeMock = new VSCodeMock();
    vscodeMock.setupWorkspace(["/test/repo"])
           .setupConfiguration("timelad", { githubToken: "test-token" })
           .apply();
    
    testUtils = new TestUtils();
    gitCommands = new GitCommands();
    
    // Get references to the injected services for mocking
    mockGitService = gitCommands.gitService;
    mockNotificationService = gitCommands.notificationService;
    
    // Set up default mocks
    testUtils.sandbox.stub(mockGitService, 'getRepositoryPath').resolves("/test/repo");
    testUtils.sandbox.stub(mockGitService, 'getCommitHistory').resolves([]);
    testUtils.sandbox.stub(mockGitService, 'restoreToCommit').resolves({ success: true });
    testUtils.sandbox.stub(mockGitService, 'checkForUncommittedChanges').resolves({ hasChanges: false, files: [] });
  });

  afterEach(() => {
    testUtils.cleanup();
    vscodeMock.cleanup();
  });

  describe("constructor", () => {
    it("should initialize successfully with all dependencies", () => {
      assert.ok(gitCommands);
      assert.ok(gitCommands.gitService);
      assert.ok(gitCommands.notificationService);
      assert.strictEqual(typeof gitCommands.showGitInfo, "function");
      assert.strictEqual(typeof gitCommands.restoreVersion, "function");
    });
  });

  describe("showGitInfo command", () => {
    it("should display repository information when repository exists", async () => {
      const mockCommits = [
        { hash: "abc123", author: "Test User", date: "2023-01-01", subject: "Test commit" },
        { hash: "def456", author: "Test User", date: "2023-01-02", subject: "Another commit" }
      ];
      mockGitService.getCommitHistory.resolves(mockCommits);
      
      await gitCommands.showGitInfo();
      
      assert.ok(mockGitService.getRepositoryPath.calledOnce);
      assert.ok(mockGitService.getCommitHistory.calledWith("/test/repo"));
      
      // Should show information about the repository
      const vscode = vscodeMock.getMock();
      assert.ok(vscode.window.showInformationMessage.called);
    });

    it("should show error when no repository is found", async () => {
      mockGitService.getRepositoryPath.resolves(null);
      
      await gitCommands.showGitInfo();
      
      const vscode = vscodeMock.getMock();
      assert.ok(vscode.window.showErrorMessage.calledWith(sinon.match(/No Git repository found/)));
    });

    it("should handle git service errors gracefully", async () => {
      mockGitService.getCommitHistory.rejects(new Error("Git command failed"));
      
      await gitCommands.showGitInfo();
      
      const vscode = vscodeMock.getMock();
      assert.ok(vscode.window.showErrorMessage.called);
    });
  });

  describe("restoreVersion command", () => {
    beforeEach(() => {
      const mockCommits = [
        { hash: "abc123", author: "Test User", date: "2023-01-01", subject: "Test commit" },
        { hash: "def456", author: "Test User", date: "2023-01-02", subject: "Another commit" }
      ];
      mockGitService.getCommitHistory.resolves(mockCommits);
    });

    it("should successfully restore to selected commit", async () => {
      const vscode = vscodeMock.getMock();
      vscode.window.showQuickPick.resolves({
        label: "abc123 - Test commit",
        commitHash: "abc123"
      });
      
      await gitCommands.restoreVersion();
      
      assert.ok(mockGitService.getCommitHistory.called);
      assert.ok(vscode.window.showQuickPick.called);
      assert.ok(mockGitService.restoreToCommit.calledWith("/test/repo", "abc123"));
      assert.ok(vscode.window.showInformationMessage.calledWith(sinon.match(/successfully restored/)));
    });

    it("should handle user cancellation gracefully", async () => {
      const vscode = vscodeMock.getMock();
      vscode.window.showQuickPick.resolves(undefined); // User cancelled
      
      await gitCommands.restoreVersion();
      
      assert.ok(vscode.window.showQuickPick.called);
      assert.ok(mockGitService.restoreToCommit.notCalled);
    });

    it("should handle restore failures", async () => {
      const vscode = vscodeMock.getMock();
      vscode.window.showQuickPick.resolves({
        label: "invalid123 - Invalid commit",
        commitHash: "invalid123"
      });
      mockGitService.restoreToCommit.resolves({ 
        success: false, 
        error: "Commit not found" 
      });
      
      await gitCommands.restoreVersion();
      
      assert.ok(vscode.window.showErrorMessage.calledWith(sinon.match(/Failed to restore/)));
    });

    it("should warn about uncommitted changes", async () => {
      mockGitService.checkForUncommittedChanges.resolves({
        hasChanges: true,
        files: [{ status: "M", fileName: "test.js" }],
        summary: "1 file modified"
      });
      
      const vscode = vscodeMock.getMock();
      vscode.window.showWarningMessage.resolves("Continue");
      vscode.window.showQuickPick.resolves({
        label: "abc123 - Test commit",
        commitHash: "abc123"
      });
      
      await gitCommands.restoreVersion();
      
      assert.ok(vscode.window.showWarningMessage.calledWith(sinon.match(/uncommitted changes/)));
      assert.ok(mockGitService.restoreToCommit.called);
    });

    it("should cancel restore when user chooses not to continue with uncommitted changes", async () => {
      mockGitService.checkForUncommittedChanges.resolves({
        hasChanges: true,
        files: [{ status: "M", fileName: "test.js" }],
        summary: "1 file modified"
      });
      
      const vscode = vscodeMock.getMock();
      vscode.window.showWarningMessage.resolves(undefined); // User cancelled
      
      await gitCommands.restoreVersion();
      
      assert.ok(vscode.window.showWarningMessage.called);
      assert.ok(vscode.window.showQuickPick.notCalled);
      assert.ok(mockGitService.restoreToCommit.notCalled);
    });
  });

  describe("saveChanges command", () => {
    it("should save uncommitted changes with generated commit message", async () => {
      mockGitService.checkForUncommittedChanges.resolves({
        hasChanges: true,
        files: [
          { status: "M", fileName: "src/test.js", type: "modified" },
          { status: "A", fileName: "new-file.js", type: "added" }
        ],
        summary: "2 files changed"
      });
      
      const vscode = vscodeMock.getMock();
      vscode.window.showInputBox.resolves("feat: add new functionality");
      testUtils.sandbox.stub(mockGitService, 'commitChanges').resolves({ success: true });
      
      await gitCommands.saveChanges();
      
      assert.ok(mockGitService.checkForUncommittedChanges.called);
      assert.ok(vscode.window.showInputBox.called);
      assert.ok(mockGitService.commitChanges.calledWith("/test/repo", "feat: add new functionality"));
    });

    it("should show message when no changes to commit", async () => {
      mockGitService.checkForUncommittedChanges.resolves({
        hasChanges: false,
        files: [],
        summary: "No changes"
      });
      
      await gitCommands.saveChanges();
      
      const vscode = vscodeMock.getMock();
      assert.ok(vscode.window.showInformationMessage.calledWith(sinon.match(/No uncommitted changes/)));
    });
  });

  describe("setupVersionTracking command", () => {
    it("should initialize git repository when none exists", async () => {
      mockGitService.getRepositoryPath.resolves(null);
      testUtils.sandbox.stub(mockGitService, 'initializeRepository').resolves({ success: true });
      
      const vscode = vscodeMock.getMock();
      vscode.window.showInformationMessage.resolves("Yes");
      
      await gitCommands.setupVersionTracking();
      
      assert.ok(vscode.window.showInformationMessage.calledWith(sinon.match(/initialize/)));
      assert.ok(mockGitService.initializeRepository.called);
    });

    it("should show repository status when git repo already exists", async () => {
      await gitCommands.setupVersionTracking();
      
      const vscode = vscodeMock.getMock();
      assert.ok(vscode.window.showInformationMessage.calledWith(sinon.match(/already initialized/)));
    });
  });

  describe("error handling", () => {
    it("should handle service initialization failures", () => {
      // Test that commands can handle when services fail to initialize
      const commands = new GitCommands();
      assert.ok(commands);
    });

    it("should handle workspace changes during command execution", async () => {
      // Start command execution
      const promise = gitCommands.showGitInfo();
      
      // Simulate workspace change
      vscodeMock.setupWorkspace([]);
      mockGitService.getRepositoryPath.resolves(null);
      
      await promise;
      
      // Should handle gracefully
      const vscode = vscodeMock.getMock();
      assert.ok(vscode.window.showErrorMessage.called);
    });
  });
});