/**
 * Unit tests for GitCommands
 */

const assert = require("assert");
const sinon = require("sinon");
const TestUtils = require("./testUtils");

// Mock the vscode module
const mockVscode = {
  window: {
    showErrorMessage: sinon.stub(),
    showInformationMessage: sinon.stub(),
    showWarningMessage: sinon.stub(),
    showQuickPick: sinon.stub(),
    createWebviewPanel: sinon.stub(),
    showInputBox: sinon.stub(),
    createQuickPick: sinon.stub().returns({
      title: "",
      placeholder: "",
      items: [],
      onDidAccept: sinon.stub(),
      show: sinon.stub(),
      dispose: sinon.stub(),
    }),
  },
  workspace: {
    getConfiguration: () => ({
      get: () => false,
      update: () => {},
    }),
    workspaceFolders: [
      {
        uri: { fsPath: "/test/workspace" },
        name: "test-workspace",
      },
    ],
  },
  ViewColumn: {
    One: 1,
    Two: 2,
  },
  commands: {
    registerCommand: sinon.stub(),
    executeCommand: sinon.stub(),
  },
};

try {
  require.cache[require.resolve("vscode")] = {
    exports: mockVscode,
  };
} catch (e) {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (...args) {
    if (args[0] === "vscode") {
      return mockVscode;
    }
    return originalRequire.apply(this, args);
  };
}

const GitCommands = require("../commands/gitCommands");

describe("GitCommands", () => {
  let testUtils;
  let gitCommands;

  beforeEach(() => {
    testUtils = new TestUtils();
    gitCommands = new GitCommands();
    // Reset all stubs
    mockVscode.window.showErrorMessage.resetHistory();
    mockVscode.window.showInformationMessage.resetHistory();
    mockVscode.window.showWarningMessage.resetHistory();
    mockVscode.window.showQuickPick.resetHistory();
  });

  afterEach(() => {
    testUtils.cleanup();
  });

  describe("constructor", () => {
    it("should initialize with GitService and GitHubService", () => {
      assert.ok(gitCommands.gitService);
      assert.ok(gitCommands.githubService);
    });
  });

  describe("showGitInfo", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitCommands.showGitInfo, "function");
    });

    it("should handle git service success", async () => {
      // Stub the gitService method to return mock data
      sinon.stub(gitCommands.gitService, "getCurrentBranchInfo").resolves({
        branch: "main",
        version: "1.0.0",
      });

      await gitCommands.showGitInfo();

      // Should show information message
      assert.ok(mockVscode.window.showInformationMessage.called);
    });

    it("should handle git service error", async () => {
      // Stub the gitService method to throw an error
      sinon
        .stub(gitCommands.gitService, "getCurrentBranchInfo")
        .rejects(new Error("Test error"));

      await gitCommands.showGitInfo();

      // Should show an error message
      assert.ok(mockVscode.window.showErrorMessage.called);
    });
  });

  describe("showGitHistory", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitCommands.showGitHistory, "function");
    });

    it("should create webview panel", async () => {
      const mockPanel = {
        webview: {
          html: "",
          options: {},
          onDidReceiveMessage: sinon.stub(),
        },
        dispose: sinon.stub(),
        onDidDispose: sinon.stub(),
      };

      mockVscode.window.createWebviewPanel.returns(mockPanel);
      sinon.stub(gitCommands.gitService, "getCommits").resolves([]);

      await gitCommands.showGitHistory();

      assert.ok(mockVscode.window.createWebviewPanel.called);
    });
  });

  describe("listCommits", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitCommands.listCommits, "function");
    });

    it("should create quick pick for commits", async () => {
      sinon.stub(gitCommands.gitService, "getSimpleCommits").resolves([
        {
          subject: "Test commit",
          version: "1.0.0",
          author: "Test User",
          date: "2023-01-01",
          hash: "abc123",
        },
      ]);

      await gitCommands.listCommits();

      assert.ok(mockVscode.window.createQuickPick.called);
    });
  });

  describe("saveChanges", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitCommands.saveChanges, "function");
    });
  });

  describe("setupVersionTracking", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitCommands.setupVersionTracking, "function");
    });
  });

  describe("saveToGitHub", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitCommands.saveToGitHub, "function");
    });
  });

  describe("loadFromGitHub", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitCommands.loadFromGitHub, "function");
    });
  });

  describe("restoreVersion", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitCommands.restoreVersion, "function");
    });
  });
});
