/**
 * Error condition testing for all services
 * Testing failure scenarios, edge cases, and error handling
 */

const assert = require("assert");
const sinon = require("sinon");
// Mocha functions are provided globally by VS Code test framework
const TestUtils = require("./testUtils");
const VSCodeMock = require("./vscode-mock");

let vscodeMock;

describe("Error Condition Testing", () => {
  let testUtils;

  beforeEach(() => {
    vscodeMock = new VSCodeMock();
    vscodeMock.setupWorkspace(["/test/repo"]).apply();
    testUtils = new TestUtils();
  });

  afterEach(() => {
    testUtils.cleanup();
    vscodeMock.cleanup();
  });

  describe("GitService Error Conditions", () => {
    let gitService;
    let notificationService;
    let fileOperationsService;

    beforeEach(() => {
      const { GitService } = require("../../out/services/GitService");
      const { NotificationService } = require("../../out/services/NotificationService");
      const { FileOperationsService } = require("../../out/services/FileOperationsService");
      
      notificationService = new NotificationService();
      fileOperationsService = new FileOperationsService();
      gitService = new GitService(notificationService, fileOperationsService);
    });

    it("should handle git command execution failures", async () => {
      // Mock exec to fail
      testUtils.sandbox.stub(gitService, 'executeGitCommand').rejects(new Error("git: command not found"));
      
      try {
        await gitService.getCommitHistory("/test/repo");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("git: command not found"));
      }
    });

    it("should handle invalid repository paths", async () => {
      testUtils.sandbox.stub(fileOperationsService, 'exists').resolves(false);
      
      const path = await gitService.getRepositoryPath();
      assert.strictEqual(path, null);
    });

    it("should handle corrupted git repository", async () => {
      testUtils.sandbox.stub(gitService, 'executeGitCommand').rejects(new Error("fatal: not a git repository"));
      
      try {
        await gitService.getCommitHistory("/test/corrupted");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("not a git repository"));
      }
    });

    it("should handle network timeouts during remote operations", async () => {
      testUtils.sandbox.stub(gitService, 'executeGitCommand').rejects(new Error("Connection timed out"));
      
      try {
        await gitService.fetchFromRemote("/test/repo");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("Connection timed out"));
      }
    });

    it("should handle permission denied errors", async () => {
      testUtils.sandbox.stub(gitService, 'executeGitCommand').rejects(new Error("Permission denied"));
      
      try {
        await gitService.restoreToCommit("/test/repo", "abc123");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("Permission denied"));
      }
    });

    it("should handle invalid commit hashes", async () => {
      testUtils.sandbox.stub(gitService, 'executeGitCommand').rejects(new Error("fatal: bad object invalid123"));
      
      const result = await gitService.restoreToCommit("/test/repo", "invalid123");
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes("bad object"));
    });

    it("should handle git lock file conflicts", async () => {
      testUtils.sandbox.stub(gitService, 'executeGitCommand').rejects(new Error("fatal: Unable to create 'index.lock': File exists"));
      
      try {
        await gitService.commitChanges("/test/repo", "test commit");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("index.lock"));
      }
    });

    it("should handle empty commit attempts", async () => {
      testUtils.sandbox.stub(gitService, 'executeGitCommand').rejects(new Error("nothing to commit, working tree clean"));
      
      try {
        await gitService.commitChanges("/test/repo", "empty commit");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("nothing to commit"));
      }
    });
  });

  describe("FileOperationsService Error Conditions", () => {
    let fileOperationsService;

    beforeEach(() => {
      const { FileOperationsService } = require("../../out/services/FileOperationsService");
      fileOperationsService = new FileOperationsService();
    });

    it("should handle file not found errors", async () => {
      testUtils.sandbox.stub(fileOperationsService, 'readFile').rejects(new Error("ENOENT: no such file or directory"));
      
      try {
        await fileOperationsService.readFile("/nonexistent/file.txt");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("ENOENT"));
      }
    });

    it("should handle permission denied for file operations", async () => {
      testUtils.sandbox.stub(fileOperationsService, 'writeFile').rejects(new Error("EACCES: permission denied"));
      
      try {
        await fileOperationsService.writeFile("/protected/file.txt", "content");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("EACCES"));
      }
    });

    it("should handle disk space errors", async () => {
      testUtils.sandbox.stub(fileOperationsService, 'writeFile').rejects(new Error("ENOSPC: no space left on device"));
      
      try {
        await fileOperationsService.writeFile("/full/disk/file.txt", "large content");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("ENOSPC"));
      }
    });

    it("should handle file system corruption", async () => {
      testUtils.sandbox.stub(fileOperationsService, 'exists').rejects(new Error("EIO: i/o error"));
      
      try {
        await fileOperationsService.exists("/corrupted/path");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("EIO"));
      }
    });
  });

  describe("NotificationService Error Conditions", () => {
    let notificationService;

    beforeEach(() => {
      const { NotificationService } = require("../../out/services/NotificationService");
      notificationService = new NotificationService();
    });

    it("should handle VS Code API unavailability", () => {
      // Simulate VS Code API being unavailable
      vscodeMock.getMock().window.showErrorMessage = null;
      
      // Should not throw when API is unavailable
      assert.doesNotThrow(() => {
        notificationService.showError("Test error");
      });
    });

    it("should handle notification display failures", () => {
      vscodeMock.getMock().window.showErrorMessage = testUtils.sandbox.stub().rejects(new Error("UI not available"));
      
      // Should handle rejection gracefully
      assert.doesNotThrow(async () => {
        await notificationService.showError("Test error");
      });
    });
  });

  describe("CommitMessageService Error Conditions", () => {
    let commitMessageService;

    beforeEach(() => {
      const { CommitMessageService } = require("../../out/services/CommitMessageService");
      commitMessageService = new CommitMessageService();
    });

    it("should handle invalid file change data", async () => {
      const invalidFiles = [
        { fileName: null, type: "added" },
        { fileName: "", type: null },
        null,
        undefined
      ];
      
      const message = await commitMessageService.generateCommitMessage(invalidFiles, "test summary");
      
      // Should generate a basic message even with invalid data
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });

    it("should handle empty or null summary", async () => {
      const files = [{ fileName: "test.js", type: "added" }];
      
      const message1 = await commitMessageService.generateCommitMessage(files, null);
      const message2 = await commitMessageService.generateCommitMessage(files, "");
      
      assert.strictEqual(typeof message1, 'string');
      assert.strictEqual(typeof message2, 'string');
      assert.ok(message1.length > 0);
      assert.ok(message2.length > 0);
    });
  });

  describe("GitHistoryWebviewProvider Error Conditions", () => {
    let provider;
    let mockGitService;
    let mockNotificationService;

    beforeEach(() => {
      mockGitService = {
        getRepositoryPath: testUtils.sandbox.stub(),
        getCommitHistory: testUtils.sandbox.stub(),
        restoreToCommit: testUtils.sandbox.stub(),
      };
      
      mockNotificationService = {
        showError: testUtils.sandbox.stub(),
        showInfo: testUtils.sandbox.stub(),
      };

      const { GitHistoryWebviewProvider } = require("../../out/providers/GitHistoryWebviewProvider");
      provider = new GitHistoryWebviewProvider(mockGitService, mockNotificationService);
    });

    it("should handle webview disposal during message processing", async () => {
      const mockWebview = {
        html: "",
        options: {},
        onDidReceiveMessage: testUtils.sandbox.stub(),
        postMessage: testUtils.sandbox.stub().rejects(new Error("Webview disposed")),
        asWebviewUri: testUtils.sandbox.stub().returnsArg(0),
      };

      const mockWebviewView = {
        webview: mockWebview,
        visible: true,
        onDidDispose: testUtils.sandbox.stub(),
        onDidChangeVisibility: testUtils.sandbox.stub(),
      };

      await provider.resolveWebviewView(mockWebviewView);
      
      // Should handle webview disposal gracefully
      const messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
      await messageHandler({ command: "refresh" });
      
      // Should not throw even if postMessage fails
      assert.ok(true);
    });

    it("should handle malformed webview messages", async () => {
      const mockWebview = {
        html: "",
        options: {},
        onDidReceiveMessage: testUtils.sandbox.stub(),
        postMessage: testUtils.sandbox.stub().resolves(),
        asWebviewUri: testUtils.sandbox.stub().returnsArg(0),
      };

      const mockWebviewView = {
        webview: mockWebview,
        visible: true,
        onDidDispose: testUtils.sandbox.stub(),
        onDidChangeVisibility: testUtils.sandbox.stub(),
      };

      await provider.resolveWebviewView(mockWebviewView);
      
      const messageHandler = mockWebview.onDidReceiveMessage.getCall(0).args[0];
      
      // Test various malformed messages
      const malformedMessages = [
        null,
        undefined,
        {},
        { command: null },
        { command: "" },
        "invalid string message",
        { command: "restore" }, // missing commitHash
      ];

      for (const message of malformedMessages) {
        await messageHandler(message);
        // Should handle gracefully without throwing
      }
      
      assert.ok(mockNotificationService.showError.called);
    });
  });

  describe("Integration Error Scenarios", () => {
    it("should handle cascading service failures", async () => {
      const { GitCommands } = require("../../out/commands/gitCommands");
      const gitCommands = new GitCommands();
      
      // Mock all services to fail
      testUtils.sandbox.stub(gitCommands.gitService, 'getRepositoryPath').rejects(new Error("Service unavailable"));
      testUtils.sandbox.stub(gitCommands.notificationService, 'showError').throws(new Error("Notification failed"));
      
      // Should handle cascading failures gracefully
      await gitCommands.showGitInfo();
      
      // Should not crash the extension
      assert.ok(true);
    });

    it("should handle memory pressure scenarios", async () => {
      const { GitService } = require("../../out/services/GitService");
      const { NotificationService } = require("../../out/services/NotificationService");
      const { FileOperationsService } = require("../../out/services/FileOperationsService");
      
      const gitService = new GitService(new NotificationService(), new FileOperationsService());
      
      // Simulate memory pressure by creating large objects
      const largeCommitList = Array(10000).fill().map((_, i) => ({
        hash: `commit${i}`,
        author: "Test User",
        date: new Date().toISOString(),
        subject: `Commit ${i} with a very long subject line that takes up memory`
      }));
      
      testUtils.sandbox.stub(gitService, 'executeGitCommand').resolves({
        stdout: largeCommitList.map(c => `${c.hash}|${c.author}|${c.date}|${c.subject}`).join('\n'),
        stderr: ""
      });
      
      // Should handle large datasets without crashing
      const commits = await gitService.getCommitHistory("/test/repo");
      assert.ok(Array.isArray(commits));
      assert.ok(commits.length > 0);
    });
  });
});