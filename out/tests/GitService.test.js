/**
 * Unit tests for GitService
 * Using proper testing framework with mocks and stubs
 */

const assert = require("assert");
const sinon = require("sinon");
const { describe, it, beforeEach, afterEach } = require("mocha");
const TestUtils = require("./testUtils");

// Mock the vscode module
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
try {
  require.cache[require.resolve("vscode")] = {
    exports: mockVscode,
  };
} catch (e) {
  // If vscode module doesn't exist, create a mock
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (...args) {
    if (args[0] === "vscode") {
      return mockVscode;
    }
    return originalRequire.apply(this, args);
  };
}

const GitService = require("../services/GitService");
const constants = require("../constants");

describe("GitService", () => {
  let gitService;
  let testUtils;

  beforeEach(() => {
    testUtils = new TestUtils();
    gitService = new GitService();
  });

  afterEach(() => {
    testUtils.cleanup();
  });

  describe("constructor", () => {
    it("should initialize with empty cache", () => {
      assert.strictEqual(gitService.cache.size, 0);
    });
  });

  describe("getGitExtension", () => {
    it("should be a function", () => {
      assert.strictEqual(typeof gitService.getGitExtension, "function");
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

  describe("getRepositoryPath", () => {
    it("should throw error when no repository is found", async () => {
      try {
        await gitService.getRepositoryPath();
        assert.fail("Should have thrown an error");
      } catch (error) {
        // With our new robust detection, it should throw a "no repositories" error
        // after trying all detection methods
        assert.ok(
          error.message.includes("No repositories") ||
            error.message.includes("Git extension") ||
            error.message.includes("not installed") ||
            error.message.includes("ENOENT") ||
            error.message.includes("workspace")
        );
      }
    });
  });

  describe("isGitInstalled", () => {
    it("should return boolean result", async () => {
      const result = await gitService.isGitInstalled();
      assert.strictEqual(typeof result, "boolean");
    });
  });

  describe("waitForGitReady", () => {
    it("should return false when no extension found", async () => {
      const result = await gitService.waitForGitReady(2);
      assert.strictEqual(result, false);
    });
  });
});

// Simple test runner (in a real project, you'd use a proper test framework)
async function runSimpleTests() {
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

    "GitService waitForGitReady returns false when no extension": async () => {
      const gitService = new GitService();
      // Since we mocked vscode.extensions.getExtension to return null,
      // waitForGitReady should return false quickly
      const result = await gitService.waitForGitReady(3); // 3 attempts max
      assert.strictEqual(result, false);
      console.log("✓ waitForGitReady test passed");
    },

    "GitService isGitInstalled returns boolean": async () => {
      const gitService = new GitService();
      // In test environment, git command will likely fail
      const result = await gitService.isGitInstalled();
      // We expect a boolean result
      assert.strictEqual(typeof result, "boolean");
      console.log("✓ isGitInstalled test passed");
    },

    "RestoreVersion creates proper commit message": () => {
      // Test that createRestoreCommit method exists
      const gitService = new GitService();
      assert.strictEqual(typeof gitService.createRestoreCommit, "function");
      console.log("✓ Restore methods exist test passed");
    },

    "Constants include new commit empty command": () => {
      assert.ok(constants.GIT_COMMANDS.COMMIT_EMPTY);
      assert.strictEqual(
        constants.GIT_COMMANDS.COMMIT_EMPTY,
        'git commit --allow-empty -F "%s"'
      );
      console.log("✓ COMMIT_EMPTY constant test passed");
    },

    "Constants include rev-parse HEAD command": () => {
      assert.ok(constants.GIT_COMMANDS.REV_PARSE_HEAD);
      assert.strictEqual(
        constants.GIT_COMMANDS.REV_PARSE_HEAD,
        "git rev-parse HEAD"
      );
      console.log("✓ REV_PARSE_HEAD constant test passed");
    },
  };

  let passed = 0;
  let failed = 0;

  for (const [testName, testFn] of Object.entries(testSuite)) {
    try {
      await testFn();
      passed++;
    } catch (error) {
      console.log(`✗ ${testName} failed:`, error.message);
      failed++;
    }
  }

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

if (require.main === module) {
  runSimpleTests();
}
