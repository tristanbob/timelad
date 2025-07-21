/**
 * Comprehensive tests for GitHistoryWebviewProvider
 * Testing webview provider functionality, message handling, and state management
 */

const assert = require("assert");
const sinon = require("sinon");
// Mocha functions are provided globally by VS Code test framework
const TestUtils = require("./testUtils");
const VSCodeMock = require("./vscode-mock");

let vscodeMock;

// Mock services first
const mockGitService = {
  getRepositoryPath: sinon.stub(),
  getCommitHistory: sinon.stub(),
  restoreToCommit: sinon.stub(),
  checkForUncommittedChanges: sinon.stub(),
};

const mockNotificationService = {
  showError: sinon.stub(),
  showInfo: sinon.stub(),
  showWarning: sinon.stub(),
};

const { GitHistoryWebviewProvider } = require("../../out/providers/GitHistoryWebviewProvider");

describe("GitHistoryWebviewProvider", () => {
  let provider;
  let testUtils;
  let mockWebview;
  let mockWebviewView;

  beforeEach(() => {
    // Set up centralized VS Code mock
    vscodeMock = new VSCodeMock();
    vscodeMock.setupWorkspace(["/test/repo"]).apply();
    
    testUtils = new TestUtils();
    
    // Create mock webview and webview view
    mockWebview = {
      html: "",
      options: {},
      onDidReceiveMessage: sinon.stub(),
      postMessage: sinon.stub().resolves(),
      asWebviewUri: sinon.stub().returnsArg(0),
    };

    mockWebviewView = {
      webview: mockWebview,
      visible: true,
      onDidDispose: sinon.stub(),
      onDidChangeVisibility: sinon.stub(),
    };

    // Reset service mocks
    Object.keys(mockGitService).forEach(key => {
      if (typeof mockGitService[key].reset === 'function') {
        mockGitService[key].reset();
      }
    });
    Object.keys(mockNotificationService).forEach(key => {
      if (typeof mockNotificationService[key].reset === 'function') {
        mockNotificationService[key].reset();
      }
    });

    // Create provider with mocked dependencies
    provider = new GitHistoryWebviewProvider(mockGitService, mockNotificationService);
  });

  afterEach(() => {
    testUtils.cleanup();
    vscodeMock.cleanup();
  });

  describe("constructor", () => {
    it("should initialize successfully with injected dependencies", () => {
      assert.ok(provider);
      assert.strictEqual(provider.gitService, mockGitService);
      assert.strictEqual(provider.notificationService, mockNotificationService);
    });
  });

  describe("resolveWebviewView", () => {
    it("should set up webview options and message handler", () => {
      provider.resolveWebviewView(mockWebviewView);
      
      assert.ok(mockWebview.options.enableScripts);
      assert.ok(mockWebview.onDidReceiveMessage.calledOnce);
      assert.ok(mockWebview.html.length > 0);
    });

    it("should load initial content when repository exists", async () => {
      mockGitService.getRepositoryPath.resolves("/test/repo");
      mockGitService.getCommitHistory.resolves([
        { hash: "abc123", author: "Test User", date: "2023-01-01", subject: "Test commit" }
      ]);
      
      await provider.resolveWebviewView(mockWebviewView);
      
      assert.ok(mockGitService.getRepositoryPath.calledOnce);
      assert.ok(mockGitService.getCommitHistory.calledOnce);
    });

    it("should show setup UI when no repository exists", async () => {
      mockGitService.getRepositoryPath.resolves(null);
      
      await provider.resolveWebviewView(mockWebviewView);
      
      assert.ok(mockWebview.html.includes("setup"));
    });
  });

  describe("message handling", () => {
    beforeEach(async () => {
      await provider.resolveWebviewView(mockWebviewView);
    });

    it("should handle refresh command", async () => {
      mockGitService.getRepositoryPath.resolves("/test/repo");
      mockGitService.getCommitHistory.resolves([]);
      
      const messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
      await messageHandler({ command: "refresh" });
      
      assert.ok(mockGitService.getCommitHistory.called);
      assert.ok(mockWebview.postMessage.calledWith(sinon.match({ type: "updateCommits" })));
    });

    it("should handle restore command with valid commit", async () => {
      mockGitService.restoreToCommit.resolves({ success: true });
      
      const messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
      await messageHandler({ command: "restore", commitHash: "abc123" });
      
      assert.ok(mockGitService.restoreToCommit.calledWith("/test/repo", "abc123"));
      assert.ok(mockNotificationService.showInfo.called);
    });

    it("should handle restore command failure", async () => {
      mockGitService.restoreToCommit.resolves({ success: false, error: "Commit not found" });
      
      const messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
      await messageHandler({ command: "restore", commitHash: "invalid" });
      
      assert.ok(mockNotificationService.showError.calledWith(sinon.match(/Commit not found/)));
    });

    it("should handle loadMore command for pagination", async () => {
      mockGitService.getRepositoryPath.resolves("/test/repo");
      mockGitService.getCommitHistory.resolves([
        { hash: "def456", author: "Test User", date: "2023-01-02", subject: "Another commit" }
      ]);
      
      const messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
      await messageHandler({ command: "loadMore", offset: 10 });
      
      assert.ok(mockGitService.getCommitHistory.calledWith("/test/repo", 10));
    });

    it("should handle unknown commands gracefully", async () => {
      const messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
      
      // Should not throw
      await messageHandler({ command: "unknownCommand" });
      
      // Should show error
      assert.ok(mockNotificationService.showError.calledWith(sinon.match(/Unknown command/)));
    });
  });

  describe("state management", () => {
    beforeEach(async () => {
      await provider.resolveWebviewView(mockWebviewView);
    });

    it("should track loading state during operations", async () => {
      mockGitService.getCommitHistory.callsFake(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([]), 100);
        });
      });
      
      const messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
      const refreshPromise = messageHandler({ command: "refresh" });
      
      // Should send loading state
      assert.ok(mockWebview.postMessage.calledWith(sinon.match({ type: "loading", isLoading: true })));
      
      await refreshPromise;
      
      // Should clear loading state
      assert.ok(mockWebview.postMessage.calledWith(sinon.match({ type: "loading", isLoading: false })));
    });

    it("should update commit list when new commits are loaded", async () => {
      const commits = [
        { hash: "abc123", author: "Test", date: "2023-01-01", subject: "Test 1" },
        { hash: "def456", author: "Test", date: "2023-01-02", subject: "Test 2" }
      ];
      mockGitService.getCommitHistory.resolves(commits);
      
      const messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
      await messageHandler({ command: "refresh" });
      
      assert.ok(mockWebview.postMessage.calledWith(sinon.match({
        type: "updateCommits",
        commits: commits
      })));
    });

    it("should handle error states appropriately", async () => {
      mockGitService.getCommitHistory.rejects(new Error("Git command failed"));
      
      const messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
      await messageHandler({ command: "refresh" });
      
      assert.ok(mockNotificationService.showError.calledWith(sinon.match(/Git command failed/)));
      assert.ok(mockWebview.postMessage.calledWith(sinon.match({ type: "error" })));
    });
  });

  describe("refresh functionality", () => {
    it("should refresh webview when called externally", async () => {
      await provider.resolveWebviewView(mockWebviewView);
      mockGitService.getCommitHistory.reset();
      
      await provider.refresh();
      
      assert.ok(mockGitService.getCommitHistory.called);
    });

    it("should handle refresh when webview is not visible", async () => {
      mockWebviewView.visible = false;
      await provider.resolveWebviewView(mockWebviewView);
      
      // Should not throw
      await provider.refresh();
    });
  });

  describe("disposal and cleanup", () => {
    it("should handle webview disposal", async () => {
      await provider.resolveWebviewView(mockWebviewView);
      
      // Simulate disposal
      const disposeHandler = mockWebviewView.onDidDispose.getCall(0).args[0];
      disposeHandler();
      
      // Should not throw and should clean up properly
      assert.ok(true);
    });
  });
});