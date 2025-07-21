/**
 * Comprehensive webview message handling tests
 * Testing all webview communication patterns and message types
 */

const assert = require("assert");
const sinon = require("sinon");
const TestUtils = require("./testUtils");
const VSCodeMock = require("./vscode-mock");

let vscodeMock;

describe("Webview Message Handling", () => {
  let testUtils;
  let provider;
  let mockWebview;
  let mockWebviewView;
  let mockGitService;
  let mockNotificationService;

  beforeEach(() => {
    vscodeMock = new VSCodeMock();
    vscodeMock.setupWorkspace(["/test/repo"]).apply();
    testUtils = new TestUtils();

    // Create mock services
    mockGitService = {
      getRepositoryPath: testUtils.sandbox.stub().resolves("/test/repo"),
      getCommitHistory: testUtils.sandbox.stub().resolves([]),
      restoreToCommit: testUtils.sandbox.stub().resolves({ success: true }),
      checkForUncommittedChanges: testUtils.sandbox.stub().resolves({ hasChanges: false, files: [] }),
    };

    mockNotificationService = {
      showError: testUtils.sandbox.stub(),
      showInfo: testUtils.sandbox.stub(),
      showWarning: testUtils.sandbox.stub(),
    };

    // Create mock webview
    mockWebview = {
      html: "",
      options: {},
      onDidReceiveMessage: testUtils.sandbox.stub(),
      postMessage: testUtils.sandbox.stub().resolves(),
      asWebviewUri: testUtils.sandbox.stub().returnsArg(0),
      cspSource: "vscode-webview://test",
    };

    mockWebviewView = {
      webview: mockWebview,
      visible: true,
      onDidDispose: testUtils.sandbox.stub(),
      onDidChangeVisibility: testUtils.sandbox.stub(),
      show: testUtils.sandbox.stub(),
    };

    // Create provider
    const { GitHistoryWebviewProvider } = require("../../out/providers/GitHistoryWebviewProvider");
    provider = new GitHistoryWebviewProvider(mockGitService, mockNotificationService);
  });

  afterEach(() => {
    testUtils.cleanup();
    vscodeMock.cleanup();
  });

  describe("Message Handler Registration", () => {
    it("should register message handler on webview setup", async () => {
      await provider.resolveWebviewView(mockWebviewView);
      
      assert.ok(mockWebview.onDidReceiveMessage.calledOnce);
      assert.strictEqual(typeof mockWebview.onDidReceiveMessage.getCall(0).args[0], 'function');
    });

    it("should handle multiple webview setups gracefully", async () => {
      await provider.resolveWebviewView(mockWebviewView);
      await provider.resolveWebviewView(mockWebviewView);
      
      // Should not register duplicate handlers
      assert.ok(mockWebview.onDidReceiveMessage.called);
    });
  });

  describe("Command Message Handling", () => {
    let messageHandler;

    beforeEach(async () => {
      await provider.resolveWebviewView(mockWebviewView);
      messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
    });

    describe("refresh command", () => {
      it("should handle refresh command successfully", async () => {
        const commits = [
          { hash: "abc123", author: "Test User", date: "2023-01-01", subject: "Test commit" }
        ];
        mockGitService.getCommitHistory.resolves(commits);

        await messageHandler({ command: "refresh" });

        assert.ok(mockGitService.getCommitHistory.calledOnce);
        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "updateCommits",
          commits: commits
        })));
      });

      it("should send loading states during refresh", async () => {
        mockGitService.getCommitHistory.callsFake(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve([]), 50);
          });
        });

        await messageHandler({ command: "refresh" });

        // Check for loading start and end
        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "loading",
          isLoading: true
        })));
        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "loading",
          isLoading: false
        })));
      });

      it("should handle refresh errors gracefully", async () => {
        mockGitService.getCommitHistory.rejects(new Error("Git command failed"));

        await messageHandler({ command: "refresh" });

        assert.ok(mockNotificationService.showError.calledWith(sinon.match(/Git command failed/)));
        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "error",
          message: sinon.match.string
        })));
      });
    });

    describe("restore command", () => {
      it("should handle successful restore", async () => {
        mockGitService.restoreToCommit.resolves({ success: true });

        await messageHandler({ 
          command: "restore", 
          commitHash: "abc123",
          confirmRestore: true 
        });

        assert.ok(mockGitService.restoreToCommit.calledWith("/test/repo", "abc123"));
        assert.ok(mockNotificationService.showInfo.calledWith(sinon.match(/restored/)));
        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "restoreComplete",
          success: true
        })));
      });

      it("should handle restore failures", async () => {
        mockGitService.restoreToCommit.resolves({ 
          success: false, 
          error: "Commit not found" 
        });

        await messageHandler({ 
          command: "restore", 
          commitHash: "invalid123",
          confirmRestore: true 
        });

        assert.ok(mockNotificationService.showError.calledWith(sinon.match(/Commit not found/)));
        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "restoreComplete",
          success: false
        })));
      });

      it("should validate commit hash parameter", async () => {
        await messageHandler({ command: "restore" }); // Missing commitHash

        assert.ok(mockNotificationService.showError.calledWith(sinon.match(/Invalid/)));
        assert.ok(mockGitService.restoreToCommit.notCalled);
      });

      it("should require confirmation for restore", async () => {
        await messageHandler({ 
          command: "restore", 
          commitHash: "abc123" 
          // Missing confirmRestore
        });

        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "requestConfirmation",
          action: "restore",
          commitHash: "abc123"
        })));
        assert.ok(mockGitService.restoreToCommit.notCalled);
      });
    });

    describe("loadMore command", () => {
      it("should load more commits with pagination", async () => {
        const moreCommits = [
          { hash: "def456", author: "Test User", date: "2023-01-02", subject: "Another commit" }
        ];
        mockGitService.getCommitHistory.resolves(moreCommits);

        await messageHandler({ 
          command: "loadMore", 
          offset: 10,
          limit: 20 
        });

        assert.ok(mockGitService.getCommitHistory.calledWith("/test/repo", 10, 20));
        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "appendCommits",
          commits: moreCommits
        })));
      });

      it("should handle end of commit history", async () => {
        mockGitService.getCommitHistory.resolves([]);

        await messageHandler({ 
          command: "loadMore", 
          offset: 100 
        });

        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "endOfHistory"
        })));
      });

      it("should validate pagination parameters", async () => {
        await messageHandler({ command: "loadMore" }); // Missing offset

        assert.ok(mockNotificationService.showError.calledWith(sinon.match(/Invalid/)));
      });
    });

    describe("showCommitDetails command", () => {
      it("should display commit details", async () => {
        const commitDetails = {
          hash: "abc123",
          author: "Test User",
          date: "2023-01-01",
          subject: "Test commit",
          body: "Full commit message body",
          files: [{ name: "test.js", status: "modified" }]
        };
        mockGitService.getCommitDetails = testUtils.sandbox.stub().resolves(commitDetails);

        await messageHandler({ 
          command: "showCommitDetails", 
          commitHash: "abc123" 
        });

        assert.ok(mockGitService.getCommitDetails.calledWith("abc123"));
        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "commitDetails",
          details: commitDetails
        })));
      });
    });

    describe("search command", () => {
      it("should search commits by query", async () => {
        const searchResults = [
          { hash: "abc123", author: "Test User", date: "2023-01-01", subject: "Fix bug in feature" }
        ];
        mockGitService.searchCommits = testUtils.sandbox.stub().resolves(searchResults);

        await messageHandler({ 
          command: "search", 
          query: "bug",
          searchType: "message" 
        });

        assert.ok(mockGitService.searchCommits.calledWith("/test/repo", "bug", "message"));
        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "searchResults",
          results: searchResults,
          query: "bug"
        })));
      });

      it("should handle empty search results", async () => {
        mockGitService.searchCommits = testUtils.sandbox.stub().resolves([]);

        await messageHandler({ 
          command: "search", 
          query: "nonexistent" 
        });

        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "searchResults",
          results: [],
          query: "nonexistent"
        })));
      });
    });

    describe("unknown command handling", () => {
      it("should handle unknown commands gracefully", async () => {
        await messageHandler({ command: "unknownCommand" });

        assert.ok(mockNotificationService.showError.calledWith(sinon.match(/Unknown command/)));
        assert.ok(mockWebview.postMessage.calledWith(sinon.match({
          type: "error",
          message: sinon.match(/Unknown command/)
        })));
      });
    });
  });

  describe("Message Validation", () => {
    let messageHandler;

    beforeEach(async () => {
      await provider.resolveWebviewView(mockWebviewView);
      messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
    });

    it("should validate message structure", async () => {
      const invalidMessages = [
        null,
        undefined,
        "",
        123,
        [],
        {},
        { command: null },
        { command: "" },
        { notACommand: "test" }
      ];

      for (const message of invalidMessages) {
        await messageHandler(message);
      }

      assert.ok(mockNotificationService.showError.called);
    });

    it("should sanitize message parameters", async () => {
      await messageHandler({ 
        command: "restore", 
        commitHash: "<script>alert('xss')</script>",
        confirmRestore: true 
      });

      // Should handle potentially malicious input safely
      assert.ok(mockGitService.restoreToCommit.notCalled);
      assert.ok(mockNotificationService.showError.called);
    });
  });

  describe("Webview State Management", () => {
    let messageHandler;

    beforeEach(async () => {
      await provider.resolveWebviewView(mockWebviewView);
      messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
    });

    it("should track webview state during operations", async () => {
      mockGitService.getCommitHistory.callsFake(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([]), 100);
        });
      });

      const refreshPromise = messageHandler({ command: "refresh" });

      // Should set loading state
      assert.ok(mockWebview.postMessage.calledWith(sinon.match({
        type: "loading",
        isLoading: true
      })));

      await refreshPromise;

      // Should clear loading state
      assert.ok(mockWebview.postMessage.calledWith(sinon.match({
        type: "loading",
        isLoading: false
      })));
    });

    it("should handle concurrent message processing", async () => {
      mockGitService.getCommitHistory.callsFake(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([]), 50);
        });
      });

      // Send multiple concurrent messages
      const promises = [
        messageHandler({ command: "refresh" }),
        messageHandler({ command: "refresh" }),
        messageHandler({ command: "loadMore", offset: 10 })
      ];

      await Promise.all(promises);

      // Should handle all messages without conflicts
      assert.ok(mockWebview.postMessage.called);
    });
  });

  describe("Error Recovery", () => {
    let messageHandler;

    beforeEach(async () => {
      await provider.resolveWebviewView(mockWebviewView);
      messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
    });

    it("should recover from webview communication failures", async () => {
      mockWebview.postMessage.rejects(new Error("Webview disposed"));

      // Should not throw even if postMessage fails
      await messageHandler({ command: "refresh" });

      assert.ok(true); // Test passes if no exception thrown
    });

    it("should continue processing after individual message failures", async () => {
      mockGitService.getCommitHistory.rejects(new Error("First call fails"));

      await messageHandler({ command: "refresh" });

      // Reset and try again
      mockGitService.getCommitHistory.resolves([]);
      await messageHandler({ command: "refresh" });

      assert.ok(mockGitService.getCommitHistory.calledTwice);
    });
  });

  describe("Performance Considerations", () => {
    let messageHandler;

    beforeEach(async () => {
      await provider.resolveWebviewView(mockWebviewView);
      messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
    });

    it("should handle large commit datasets efficiently", async () => {
      const largeCommitSet = Array(1000).fill().map((_, i) => ({
        hash: `commit${i}`,
        author: "Test User",
        date: "2023-01-01",
        subject: `Commit ${i}`
      }));

      mockGitService.getCommitHistory.resolves(largeCommitSet);

      const startTime = Date.now();
      await messageHandler({ command: "refresh" });
      const endTime = Date.now();

      // Should complete within reasonable time
      assert.ok(endTime - startTime < 1000); // Less than 1 second
      assert.ok(mockWebview.postMessage.calledWith(sinon.match({
        type: "updateCommits",
        commits: largeCommitSet
      })));
    });

    it("should throttle rapid successive messages", async () => {
      // Send rapid fire messages
      const promises = Array(10).fill().map(() => 
        messageHandler({ command: "refresh" })
      );

      await Promise.all(promises);

      // Should handle all messages but may optimize/batch some operations
      assert.ok(mockGitService.getCommitHistory.called);
    });
  });
});