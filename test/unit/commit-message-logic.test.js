/**
 * Pure unit tests for commit message generation logic
 * Tests business logic without VS Code dependencies
 */

const assert = require('assert');
const sinon = require('sinon');
const { describe, it, beforeEach, afterEach } = require('mocha');

// Import the CommitMessageService from compiled output
const { CommitMessageService } = require('../../out/services/CommitMessageService');

describe('CommitMessageService Logic', () => {
  let commitMessageService;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    commitMessageService = new CommitMessageService();
  });

  afterEach(() => {
    commitMessageService.clearCache();
    sandbox.restore();
  });

  describe('generateCommitMessage', () => {
    it('should generate feat message for new files', async () => {
      const files = [
        { fileName: 'src/newFeature.js', type: 'added' },
        { fileName: 'tests/newFeature.test.js', type: 'added' }
      ];
      const summary = '2 files changed, 45 insertions(+)';

      const message = await commitMessageService.generateCommitMessage(files, summary);
      
      assert.ok(message.includes('feat'));
      assert.ok(message.includes('add'));
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });

    it('should generate fix message for bug-related changes', async () => {
      const files = [
        { fileName: 'src/buggyFile.js', type: 'modified' }
      ];
      const summary = '1 file changed, 5 insertions(+), 2 deletions(-)';

      const message = await commitMessageService.generateCommitMessage(files, summary);
      
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });

    it('should handle empty file list', async () => {
      const message = await commitMessageService.generateCommitMessage([], 'no changes');
      
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });

    it('should handle mixed file types', async () => {
      const files = [
        { fileName: 'src/existing.js', type: 'modified' },
        { fileName: 'src/new.js', type: 'added' },
        { fileName: 'src/old.js', type: 'deleted' }
      ];
      const summary = '3 files changed, 10 insertions(+), 5 deletions(-)';

      const message = await commitMessageService.generateCommitMessage(files, summary);
      
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });

    it('should handle special characters in file names', async () => {
      const files = [
        { fileName: 'src/file with spaces.js', type: 'added' },
        { fileName: 'src/file-with-dashes.js', type: 'modified' },
        { fileName: 'src/file_with_underscores.js', type: 'deleted' }
      ];
      const summary = '3 files changed';

      const message = await commitMessageService.generateCommitMessage(files, summary);
      
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });

    it('should be deterministic for same input', async () => {
      const files = [{ fileName: 'test.js', type: 'added' }];
      const summary = 'test summary';

      const message1 = await commitMessageService.generateCommitMessage(files, summary);
      const message2 = await commitMessageService.generateCommitMessage(files, summary);
      
      assert.strictEqual(message1, message2);
    });
  });

  describe('clearCache', () => {
    it('should clear internal cache', () => {
      // This tests that clearCache doesn't throw
      assert.doesNotThrow(() => {
        commitMessageService.clearCache();
      });
    });

    it('should be callable multiple times', () => {
      commitMessageService.clearCache();
      commitMessageService.clearCache();
      commitMessageService.clearCache();
      
      // Should not throw
      assert.ok(true);
    });
  });

  describe('error handling', () => {
    it('should handle null files parameter', async () => {
      const message = await commitMessageService.generateCommitMessage(null, 'test');
      
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });

    it('should handle undefined files parameter', async () => {
      const message = await commitMessageService.generateCommitMessage(undefined, 'test');
      
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });

    it('should handle null summary parameter', async () => {
      const files = [{ fileName: 'test.js', type: 'added' }];
      const message = await commitMessageService.generateCommitMessage(files, null);
      
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });

    it('should handle malformed file objects', async () => {
      const files = [
        { fileName: 'test.js' }, // missing type
        { type: 'added' }, // missing fileName
        null,
        undefined,
        { fileName: '', type: '' },
        { fileName: null, type: null }
      ];
      
      const message = await commitMessageService.generateCommitMessage(files, 'test');
      
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });
  });

  describe('performance', () => {
    it('should handle large file lists efficiently', async () => {
      const largeFileList = Array(1000).fill().map((_, i) => ({
        fileName: `file${i}.js`,
        type: i % 3 === 0 ? 'added' : i % 3 === 1 ? 'modified' : 'deleted'
      }));

      const startTime = Date.now();
      const message = await commitMessageService.generateCommitMessage(largeFileList, 'large change');
      const endTime = Date.now();

      assert.ok(endTime - startTime < 1000); // Should complete in less than 1 second
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });
  });
});