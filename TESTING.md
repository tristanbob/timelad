# Testing Framework for TimeLad Extension

This document describes the comprehensive testing framework set up for the TimeLad VS Code extension.

## Overview

The testing framework consists of:

- **Unit Tests**: Fast, isolated tests for individual components
- **Integration Tests**: Tests that run within the VS Code environment
- **Mocking**: Comprehensive mocking of VS Code APIs and external dependencies
- **Code Coverage**: Detailed coverage reporting with configurable thresholds

## Test Structure

```
├── src/
│   ├── tests/
│   │   ├── testUtils.js          # Test utilities and mocking helpers
│   │   ├── GitService.test.js    # Unit tests for GitService
│   │   ├── GitHubService.test.js # Unit tests for GitHubService
│   │   └── gitCommands.test.js   # Unit tests for git commands
├── test/
│   ├── setup.js                  # Global test setup
│   ├── runTest.js               # Integration test runner
│   └── suite/
│       ├── index.js             # Test suite configuration
│       └── extension.test.js    # Integration tests for extension
├── .mocharc.json                # Mocha configuration
└── .nycrc.json                  # Code coverage configuration
```

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### Code Coverage

```bash
npm run test:coverage
```

### Watch Mode (Unit Tests)

```bash
npm run test:watch
```

## Test Categories

### Unit Tests

Located in `src/tests/`, these tests:

- Run quickly without VS Code environment
- Use comprehensive mocking via `testUtils.js`
- Test individual functions and classes in isolation
- Use Mocha as the test runner with Sinon for mocking

### Integration Tests

Located in `test/suite/`, these tests:

- Run within actual VS Code environment
- Test extension activation, commands, and UI integration
- Use `@vscode/test-electron` to download and run VS Code
- Verify end-to-end functionality

## Mocking Framework

The `TestUtils` class provides comprehensive mocking capabilities:

```javascript
const TestUtils = require("./testUtils");

describe("My Test", () => {
  let testUtils;

  beforeEach(() => {
    testUtils = new TestUtils();
  });

  afterEach(() => {
    testUtils.cleanup(); // Clean up all mocks
  });

  it("should test with VS Code mock", () => {
    const vscode = testUtils.createVSCodeMock();
    // Use mocked VS Code API
  });
});
```

### Available Mocks

- **VS Code API**: Complete mock of vscode module
- **Git Extension**: Mock Git extension with repositories
- **Child Process**: Mock command execution
- **Workspace Folders**: Mock workspace environment

## Code Coverage

Code coverage is configured with these thresholds:

- **Statements**: 70%
- **Branches**: 60%
- **Functions**: 70%
- **Lines**: 70%

Coverage reports are generated in:

- Console: Text summary
- HTML: `coverage/index.html`
- LCOV: `coverage/lcov.info`

## Writing Tests

### Unit Test Example

```javascript
const assert = require("assert");
const sinon = require("sinon");
const TestUtils = require("./testUtils");

describe("MyService", () => {
  let testUtils;
  let myService;

  beforeEach(() => {
    testUtils = new TestUtils();
    myService = new MyService();
  });

  afterEach(() => {
    testUtils.cleanup();
  });

  it("should do something", () => {
    // Arrange
    const stub = sinon.stub(myService, "someMethod").returns("mocked");

    // Act
    const result = myService.doSomething();

    // Assert
    assert.strictEqual(result, "expected");
    assert.ok(stub.called);
  });
});
```

### Integration Test Example

```javascript
const assert = require("assert");
const vscode = require("vscode");

suite("Extension Integration Tests", () => {
  test("Command should be registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("timelad.showGitInfo"));
  });
});
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` and `afterEach` for setup/cleanup
- Always clean up mocks with `testUtils.cleanup()`

### 2. Descriptive Test Names

- Use clear, descriptive test names
- Follow the pattern: "should [expected behavior] when [condition]"

### 3. Arrange-Act-Assert Pattern

```javascript
it("should return user data when valid ID provided", () => {
  // Arrange
  const userId = 123;
  const expectedUser = { id: 123, name: "Test" };

  // Act
  const result = service.getUser(userId);

  // Assert
  assert.deepStrictEqual(result, expectedUser);
});
```

### 4. Mock External Dependencies

- Always mock VS Code APIs
- Mock file system operations
- Mock network requests
- Use `testUtils` for consistent mocking

### 5. Test Error Conditions

- Test both success and failure paths
- Verify error messages and types
- Test edge cases and boundary conditions

## Continuous Integration

Tests are configured to run automatically:

- Before publishing (`vscode:prepublish` script)
- During development (watch mode available)
- In CI/CD pipelines (exit codes indicate success/failure)

## Debugging Tests

### Running Individual Tests

```bash
# Run specific test file
npx mocha src/tests/GitService.test.js

# Run tests matching pattern
npx mocha src/tests/*.test.js --grep "GitService"
```

### VS Code Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/.bin/mocha",
  "args": ["src/tests/**/*.test.js"],
  "console": "integratedTerminal"
}
```

## Performance Considerations

- Unit tests should run in < 5 seconds total
- Integration tests may take 30-60 seconds (VS Code startup)
- Use mocks to avoid slow operations (file I/O, network)
- Consider test parallelization for large test suites

## Troubleshooting

### Common Issues

1. **VS Code Extension Not Found**: Ensure extension is properly packaged
2. **Timeout Errors**: Increase timeout in test configuration
3. **Mock Issues**: Verify mocks are properly cleaned up
4. **Coverage Too Low**: Add more test cases or adjust thresholds

### Getting Help

- Check existing tests for examples
- Review VS Code extension testing documentation
- Use `console.log` for debugging (remove before commit)
- Run tests with `--reporter tap` for detailed output
