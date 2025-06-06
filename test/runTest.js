const path = require("path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  try {
    // Set environment variables for VS Code download
    process.env.VSCODE_TEST_VERSION = "1.70.0";
    process.env.DISPLAY = process.env.DISPLAY || ":99.0";

    // The folder containing the Extension Manifest package.json
    const extensionDevelopmentPath = path.resolve(__dirname, "../");

    // The path to test runner
    const extensionTestsPath = path.resolve(__dirname, "./suite/index.js");

    console.log("🚀 Starting integration tests...");
    console.log(`Extension path: ${extensionDevelopmentPath}`);
    console.log(`Test path: ${extensionTestsPath}`);

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      // Use older version that supports 32-bit Windows
      version: "1.70.0",
      // Set platform to auto-detect
      // platform: 'win32-archive', // Let it auto-detect
      // Disable other extensions during testing
      launchArgs: [
        "--disable-extensions",
        "--disable-workspace-trust",
        "--skip-welcome",
        "--skip-release-notes",
        "--no-sandbox", // Sometimes needed for older versions
      ],
      // Set download timeout
      downloadTimeout: 180000, // 3 minutes for slower downloads
      // Retry options
      retryCount: 2,
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
    } else if (err.message.includes("32-bit")) {
      console.log("\n💡 32-bit Windows detected:");
      console.log("- Using VS Code 1.70.0 (last version with 32-bit support)");
      console.log("- This is normal for 32-bit systems");
    }

    process.exit(1);
  }
}

main();
