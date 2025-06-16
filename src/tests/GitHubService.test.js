/**
 * Unit tests for GitHubService
 * 
 * Mocha globals:
 * - describe, it, beforeEach, afterEach
 */

/* global describe, it, beforeEach, afterEach */

const assert = require("assert");
const sinon = require("sinon");
const TestUtils = require("./testUtils");

// Simple mock for vscode
const mockVscode = {
  window: {
    showErrorMessage: () => {},
    showInformationMessage: () => {},
    showWarningMessage: () => {},
    showInputBox: () => Promise.resolve(""),
  },
  workspace: {
    getConfiguration: () => ({
      get: () => "",
      update: () => Promise.resolve(),
    }),
  },
};

// Mock the vscode module globally
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

const GitHubService = require("../services/GitHubService");

describe("GitHubService", () => {
  let gitHubService;
  let testUtils;

  beforeEach(() => {
    testUtils = new TestUtils();
    gitHubService = new GitHubService();
  });

  afterEach(() => {
    testUtils.cleanup();
  });

  describe("constructor", () => {
    it("should initialize successfully", () => {
      assert.ok(gitHubService);
      assert.strictEqual(typeof gitHubService.getGitHubToken, "function");
    });
  });

  describe("getGitHubToken", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitHubService.getGitHubToken, "function");
    });
  });

  describe("repositoryExists", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitHubService.repositoryExists, "function");
    });
  });

  describe("createRepository", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitHubService.createRepository, "function");
    });
  });

  // getCurrentBranch method has been removed as it's not used in the codebase

  describe("getUserRepositories", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitHubService.getUserRepositories, "function");
    });
  });

  describe("cloneRepository", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitHubService.cloneRepository, "function");
    });
  });
});
