/**
 * Basic tests for GitService
 * This demonstrates how the refactored structure makes testing easier
 */

const assert = require("assert");

// Mock vscode module for testing
const mockVscode = {
  extensions: {
    getExtension: () => null,
  },
  window: {
    showErrorMessage: () => {},
    showInformationMessage: () => {},
    showWarningMessage: () => {},
  },
};

// Mock the vscode module
require.cache[require.resolve("vscode")] = {
  exports: mockVscode,
};

const GitService = require("../services/GitService");
const constants = require("../constants");

describe("GitService", () => {
  let gitService;

  beforeEach(() => {
    gitService = new GitService();
  });

  describe("constructor", () => {
    it("should initialize with empty cache", () => {
      assert.strictEqual(gitService.cache.size, 0);
    });
  });

  describe("getGitExtension", () => {
    it("should return null when Git extension is not found", () => {
      const result = gitService.getGitExtension();
      assert.strictEqual(result, null);
    });
  });

  describe("clearCache", () => {
    it("should clear the cache", () => {
      // Add something to cache first
      gitService.cache.set("test", { data: "test", timestamp: Date.now() });
      assert.strictEqual(gitService.cache.size, 1);

      // Clear cache
      gitService.clearCache();
      assert.strictEqual(gitService.cache.size, 0);
    });
  });

  describe("getRepositoryPath", async () => {
    it("should throw error when Git extension is not found", async () => {
      try {
        await gitService.getRepositoryPath();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.strictEqual(
          error.message,
          constants.ERRORS.GIT_EXTENSION_NOT_FOUND
        );
      }
    });
  });
});

// Simple test runner (in a real project, you'd use a proper test framework)
if (require.main === module) {
  console.log("Running GitService tests...");

  const testSuite = {
    "GitService constructor": () => {
      const gitService = new GitService();
      assert.strictEqual(gitService.cache.size, 0);
      console.log("✓ Constructor test passed");
    },

    "GitService clearCache": () => {
      const gitService = new GitService();
      gitService.cache.set("test", "data");
      gitService.clearCache();
      assert.strictEqual(gitService.cache.size, 0);
      console.log("✓ Clear cache test passed");
    },

    "Constants are defined": () => {
      assert.ok(constants.EXTENSION_NAME);
      assert.ok(constants.CACHE_TIMEOUT);
      assert.ok(constants.COMMANDS);
      console.log("✓ Constants test passed");
    },
  };

  let passed = 0;
  let failed = 0;

  for (const [testName, testFn] of Object.entries(testSuite)) {
    try {
      testFn();
      passed++;
    } catch (error) {
      console.log(`✗ ${testName} failed:`, error.message);
      failed++;
    }
  }

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
}
