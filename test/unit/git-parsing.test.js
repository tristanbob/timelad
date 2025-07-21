/**
 * Pure unit tests for Git command parsing logic
 * Tests data parsing without external dependencies
 */

const assert = require('assert');
const { describe, it } = require('mocha');

describe('Git Command Parsing Logic', () => {
  
  describe('Commit History Parsing', () => {
    it('should parse single commit correctly', () => {
      const gitOutput = 'abc123|John Doe|2023-01-01 10:00:00|Initial commit';
      const commits = parseCommitHistory(gitOutput);
      
      assert.strictEqual(commits.length, 1);
      assert.strictEqual(commits[0].hash, 'abc123');
      assert.strictEqual(commits[0].author, 'John Doe');
      assert.strictEqual(commits[0].subject, 'Initial commit');
    });

    it('should parse multiple commits correctly', () => {
      const gitOutput = [
        'abc123|John Doe|2023-01-01 10:00:00|Initial commit',
        'def456|Jane Smith|2023-01-02 11:00:00|Add feature',
        'ghi789|Bob Wilson|2023-01-03 12:00:00|Fix bug'
      ].join('\n');
      
      const commits = parseCommitHistory(gitOutput);
      
      assert.strictEqual(commits.length, 3);
      assert.strictEqual(commits[1].hash, 'def456');
      assert.strictEqual(commits[1].author, 'Jane Smith');
      assert.strictEqual(commits[2].subject, 'Fix bug');
    });

    it('should handle empty git output', () => {
      const commits = parseCommitHistory('');
      assert.strictEqual(commits.length, 0);
    });

    it('should handle malformed git output', () => {
      const gitOutput = [
        'abc123|John Doe|2023-01-01 10:00:00|Initial commit',
        'malformed line without proper format',
        'def456|Jane Smith|2023-01-02 11:00:00|Add feature',
        '|||', // empty fields
        'ghi789|Bob Wilson' // incomplete line
      ].join('\n');
      
      const commits = parseCommitHistory(gitOutput);
      
      // Should only parse valid lines
      assert.strictEqual(commits.length, 2);
      assert.strictEqual(commits[0].hash, 'abc123');
      assert.strictEqual(commits[1].hash, 'def456');
    });

    it('should handle special characters in commit messages', () => {
      const gitOutput = 'abc123|John Doe|2023-01-01 10:00:00|Fix: handle "quotes" and \\special\\ chars';
      const commits = parseCommitHistory(gitOutput);
      
      assert.strictEqual(commits.length, 1);
      assert.strictEqual(commits[0].subject, 'Fix: handle "quotes" and \\special\\ chars');
    });
  });

  describe('Git Status Parsing', () => {
    it('should parse modified files correctly', () => {
      const gitOutput = ' M src/test.js\n M src/another.js';
      const changes = parseGitStatus(gitOutput);
      
      assert.strictEqual(changes.length, 2);
      assert.strictEqual(changes[0].status, 'M');
      assert.strictEqual(changes[0].fileName, 'src/test.js');
      assert.strictEqual(changes[1].fileName, 'src/another.js');
    });

    it('should parse various file statuses', () => {
      const gitOutput = [
        ' M modified.js',
        ' A added.js', 
        ' D deleted.js',
        '?? untracked.js',
        'R  renamed.js'
      ].join('\n');
      
      const changes = parseGitStatus(gitOutput);
      
      assert.strictEqual(changes.length, 5);
      assert.strictEqual(changes[0].status, 'M');
      assert.strictEqual(changes[1].status, 'A');
      assert.strictEqual(changes[2].status, 'D');
      assert.strictEqual(changes[3].status, '??');
      assert.strictEqual(changes[4].status, 'R');
    });

    it('should handle empty git status', () => {
      const changes = parseGitStatus('');
      assert.strictEqual(changes.length, 0);
    });

    it('should handle files with spaces in names', () => {
      const gitOutput = ' M "file with spaces.js"\n M "another file.js"';
      const changes = parseGitStatus(gitOutput);
      
      assert.strictEqual(changes.length, 2);
      assert.strictEqual(changes[0].fileName, 'file with spaces.js');
      assert.strictEqual(changes[1].fileName, 'another file.js');
    });
  });

  describe('Git Error Parsing', () => {
    it('should identify common git errors', () => {
      const errors = [
        'fatal: not a git repository',
        'fatal: bad object abc123',
        'error: Your local changes would be overwritten',
        'fatal: Unable to create index.lock'
      ];

      errors.forEach(error => {
        const errorInfo = parseGitError(error);
        assert.ok(errorInfo.isGitError);
        assert.strictEqual(typeof errorInfo.type, 'string');
        assert.strictEqual(typeof errorInfo.message, 'string');
      });
    });

    it('should handle non-git errors', () => {
      const error = 'Some random error message';
      const errorInfo = parseGitError(error);
      
      assert.strictEqual(errorInfo.isGitError, false);
      assert.strictEqual(errorInfo.type, 'unknown');
    });
  });
});

// Helper functions that would normally be part of GitService
function parseCommitHistory(gitOutput) {
  if (!gitOutput || gitOutput.trim() === '') {
    return [];
  }

  return gitOutput
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      const parts = line.split('|');
      if (parts.length < 4) {
        return null; // Skip malformed lines
      }
      
      // Validate that we have non-empty essential parts
      if (!parts[0] || !parts[1] || !parts[2] || !parts[3]) {
        return null; // Skip lines with empty essential fields
      }
      
      return {
        hash: parts[0],
        author: parts[1],
        date: parts[2],
        subject: parts[3]
      };
    })
    .filter(commit => commit !== null);
}

function parseGitStatus(gitOutput) {
  if (!gitOutput || gitOutput.trim() === '') {
    return [];
  }

  return gitOutput
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      const status = line.substring(0, 2).trim();
      let fileName = line.substring(2).trim();
      
      // Handle quoted filenames
      if (fileName.startsWith('"') && fileName.endsWith('"')) {
        fileName = fileName.slice(1, -1);
      }
      
      return {
        status: status,
        fileName: fileName
      };
    });
}

function parseGitError(errorMessage) {
  const gitErrorPatterns = [
    { pattern: /fatal: not a git repository/, type: 'not_git_repo' },
    { pattern: /fatal: bad object/, type: 'bad_object' },
    { pattern: /error: Your local changes would be overwritten/, type: 'local_changes' },
    { pattern: /fatal: Unable to create.*\.lock/, type: 'lock_file' },
    { pattern: /fatal: /, type: 'fatal' },
    { pattern: /error: /, type: 'error' }
  ];

  for (const { pattern, type } of gitErrorPatterns) {
    if (pattern.test(errorMessage)) {
      return {
        isGitError: true,
        type: type,
        message: errorMessage
      };
    }
  }

  return {
    isGitError: false,
    type: 'unknown',
    message: errorMessage
  };
}