const path = require("path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  try {
    // Set environment variables for VS Code download
    process.env.DISPLAY = process.env.DISPLAY || ":99.0";
    
    // Windows path workaround - use temp directory for testing
    const tempDir = process.env.TEMP || process.env.TMP || 'C:/temp';
    const shortTestDir = path.join(tempDir, 'vscode-test-timelad');
    
    // Use forward slashes for VS Code compatibility on Windows
    const extensionDevelopmentPath = path.resolve(__dirname, "../").replace(/\\/g, '/');
    const extensionTestsPath = path.resolve(__dirname, "./suite/index.js").replace(/\\/g, '/');
    
    // Ensure test workspace exists
    const testWorkspace = path.resolve(__dirname, "../test-fixtures").replace(/\\/g, '/');

    console.log("🚀 Starting integration tests...");
    console.log(`Extension path: ${extensionDevelopmentPath}`);
    console.log(`Test path: ${extensionTestsPath}`);
    console.log(`Test workspace: ${testWorkspace}`);

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      // Use test workspace
      extensionTestsEnv: { 
        VSCODE_TEST_WORKSPACE: testWorkspace 
      },
      // Use latest stable version
      version: "stable",
      // Disable other extensions during testing
      launchArgs: [
        "--disable-extensions",
        "--disable-workspace-trust",
        "--skip-welcome",
        "--skip-release-notes",
        "--no-sandbox",
        "--disable-dev-shm-usage", // Helps with CI environments
        "--disable-gpu", // Helps with headless environments
        "--extensionTestsPath=" + extensionTestsPath, // Explicit path setting
      ],
      // Set download timeout
      downloadTimeout: 300000, // 5 minutes for slower downloads
      // Retry options
      retryCount: 3,
      // Use headless mode for CI
      ...(process.env.CI && { 
        launchArgs: [
          "--disable-extensions",
          "--disable-workspace-trust",
          "--skip-welcome", 
          "--skip-release-notes",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--headless"
        ]
      })
    });

    console.log("✅ Integration tests completed successfully!");
  } catch (err) {
    console.error("❌ Failed to run integration tests:", err.message);

    // Provide helpful error messages
    if (err.message.includes("Failed to download")) {
      console.log("\n🔧 Troubleshooting tips:");
      console.log("1. Check your internet connection");
      console.log("2. Try running: npm run test:integration:retry");
      console.log("3. Or skip integration tests and use: npm run test:unit");
      console.log("4. Check if corporate firewall is blocking downloads");
      console.log("5. Try: npm run test:safe (unit tests only)");
    } else if (err.message.includes("EACCES") || err.message.includes("permission")) {
      console.log("\n🔧 Permission issues detected:");
      console.log("1. Try running as administrator (Windows) or with sudo (Mac/Linux)");
      console.log("2. Check that the VS Code download directory is writable");
      console.log("3. Clear any existing VS Code test installations");
    } else if (err.message.includes("timeout") || err.message.includes("TIMEOUT")) {
      console.log("\n⏰ Timeout detected:");
      console.log("1. Your connection may be slow - try again");
      console.log("2. VS Code download servers may be busy");
      console.log("3. Consider running unit tests only with: npm run test:unit");
    }

    process.exit(1);
  }
}

main();
