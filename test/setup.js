/**
 * Global test setup for TimeLad extension tests
 */

// Increase timeout for async operations
process.env.NODE_ENV = "test";

// Global error handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Mock console methods in test environment if needed
if (process.env.SILENT_TESTS === "true") {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
}

// Global test utilities
global.setTimeout = global.setTimeout;
global.clearTimeout = global.clearTimeout;
