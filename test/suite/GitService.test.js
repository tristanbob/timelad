/**
 * Unit tests for GitService
 * Using proper testing framework with mocks and stubs
 */

const assert = require("assert");
const sinon = require("sinon");
// Mocha functions are provided globally by VS Code test framework
const TestUtils = require("./testUtils");
const VSCodeMock = require("./vscode-mock");

let vscodeMock;

const { GitService } = require("../../out/services/GitService");
const constants = require("../../out/constants");

describe("GitService", () => {
  let gitService;
  let testUtils;
  let notificationService;
  let fileOperationsService;

  beforeEach(() => {
    // Set up centralized VS Code mock
    vscodeMock = new VSCodeMock();
    vscodeMock.setupWorkspace(["/test/repo"]).apply();
    
    testUtils = new TestUtils();
    
    // Create service dependencies with proper mocking
    const { NotificationService } = require("../../out/services/NotificationService");
    const { FileOperationsService } = require("../../out/services/FileOperationsService");
    
    notificationService = new NotificationService();
    fileOperationsService = new FileOperationsService();
    gitService = new GitService(notificationService, fileOperationsService);
  });

  afterEach(() => {
    testUtils.cleanup();
    vscodeMock.cleanup();
  });

  describe("constructor", () => {
    it("should initialize successfully", () => {
      assert.ok(gitService);
      assert.strictEqual(typeof gitService.getRepositoryPath, "function");
    });
  });

  describe("getRepositoryPath", () => {
    it("should return null when no workspace folders exist", async () => {
      // Use centralized mock to set up empty workspace
      vscodeMock.setupWorkspace([]);
      
      const path = await gitService.getRepositoryPath();
      assert.strictEqual(path, null);
    });

    it("should return repository path when valid git repo exists", async () => {
      // Mock file system to simulate .git directory exists
      testUtils.sandbox.stub(fileOperationsService, 'exists').resolves(true);
      
      const path = await gitService.getRepositoryPath();
      assert.strictEqual(path, "/test/repo");
    });

    it("should return null when workspace folder is not a git repository", async () => {
      // Mock file system to simulate .git directory doesn't exist
      testUtils.sandbox.stub(fileOperationsService, 'exists').resolves(false);
      
      const path = await gitService.getRepositoryPath();
      assert.strictEqual(path, null);
    });
  });

  describe("getCommitHistory", () => {
    it("should return empty array when no commits exist", async () => {
      testUtils.sandbox.stub(gitService, 'executeGitCommand').resolves({ stdout: "", stderr: "" });
      
      const commits = await gitService.getCommitHistory("/test/repo");
      assert.strictEqual(Array.isArray(commits), true);
      assert.strictEqual(commits.length, 0);
    });

    it("should parse commit history correctly", async () => {
      const mockOutput = "abc123|John Doe|2023-01-01 10:00:00|Initial commit\ndef456|Jane Smith|2023-01-02 11:00:00|Add feature";
      testUtils.sandbox.stub(gitService, 'executeGitCommand').resolves({ stdout: mockOutput, stderr: "" });
      
      const commits = await gitService.getCommitHistory("/test/repo");
      assert.strictEqual(commits.length, 2);
      assert.strictEqual(commits[0].hash, "abc123");
      assert.strictEqual(commits[0].author, "John Doe");
      assert.strictEqual(commits[0].subject, "Initial commit");
    });

    it("should handle git command errors gracefully", async () => {
      testUtils.sandbox.stub(gitService, 'executeGitCommand').rejects(new Error("Git not found"));
      
      try {
        await gitService.getCommitHistory("/test/repo");
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.message.includes("Git not found"));
      }
    });
  });

  describe("checkForUncommittedChanges", () => {
    it("should return false when no changes exist", async () => {
      testUtils.sandbox.stub(gitService, 'executeGitCommand').resolves({ stdout: "", stderr: "" });
      
      const result = await gitService.checkForUncommittedChanges("/test/repo");
      assert.strictEqual(result.hasChanges, false);
      assert.strictEqual(result.files.length, 0);
    });

    it("should detect uncommitted changes correctly", async () => {
      const mockOutput = " M src/test.js\n?? new-file.js";
      testUtils.sandbox.stub(gitService, 'executeGitCommand').resolves({ stdout: mockOutput, stderr: "" });
      
      const result = await gitService.checkForUncommittedChanges("/test/repo");
      assert.strictEqual(result.hasChanges, true);
      assert.strictEqual(result.files.length, 2);
      assert.strictEqual(result.files[0].status, "M");
      assert.strictEqual(result.files[0].fileName, "src/test.js");
    });
  });

  describe("restoreToCommit", () => {
    it("should successfully restore to a valid commit", async () => {
      // Mock git commands for successful restore
      testUtils.sandbox.stub(gitService, 'executeGitCommand').resolves({ stdout: "success", stderr: "" });
      testUtils.sandbox.stub(gitService, 'checkForUncommittedChanges').resolves({ hasChanges: false, files: [], summary: "" });
      
      const result = await gitService.restoreToCommit("/test/repo", "abc123");
      assert.strictEqual(result.success, true);
    });

    it("should handle restore failures appropriately", async () => {
      testUtils.sandbox.stub(gitService, 'executeGitCommand').rejects(new Error("Commit not found"));
      
      const result = await gitService.restoreToCommit("/test/repo", "invalid123");
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes("Commit not found"));
    });
  });
});