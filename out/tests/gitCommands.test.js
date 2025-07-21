/**
 * Unit tests for GitCommands
 */

const assert = require("assert");
const sinon = require("sinon");
const { describe, it, beforeEach, afterEach } = require("mocha");
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
