#!/usr/bin/env node
/**
 * Keychain Diagnostic Tool
 * Run this to test if macOS Keychain is working correctly
 */

import { MacOSKeychainAdapter } from "../src/security/keyring/macos.js";

async function main() {
  console.log("🔐 OpenClaw Keychain Diagnostic Tool\n");
  console.log("This tool will test your macOS Keychain configuration.\n");

  const adapter = new MacOSKeychainAdapter({
    service: "openclaw-test",
    account: "test-account"
  });

  // Check availability
  console.log("1️⃣  Checking if 'security' command is available...");
  const available = await adapter.isAvailable();
  if (!available) {
    console.error("❌ FAILED: 'security' command not found.");
    console.error("   This tool only works on macOS.");
    process.exit(1);
  }
  console.log("✅ 'security' command found\n");

  // Run full diagnostic
  console.log("2️⃣  Running full diagnostic...\n");
  const result = await adapter.diagnose();

  console.log("Results:");
  console.log(`  Available: ${result.available ? "✅" : "❌"}`);
  console.log(`  Can Write: ${result.canWrite ? "✅" : "❌"}`);
  console.log(`  Can Read: ${result.canRead ? "✅" : "❌"}`);
  console.log(`  Existing Password: ${result.existingPassword ? "✅" : "❌"}`);

  if (result.errors.length > 0) {
    console.log("\n⚠️  Errors found:");
    result.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }

  // Test with actual OpenClaw service
  console.log("\n3️⃣  Testing with OpenClaw service...");
  const openclawAdapter = new MacOSKeychainAdapter({
    service: "openclaw",
    account: "master-key"
  });

  const existingKey = await openclawAdapter.getPassword();
  if (existingKey) {
    console.log("✅ Found existing OpenClaw master key");
    console.log(`   Length: ${existingKey.length} characters`);
    console.log(`   Preview: ${existingKey.substring(0, 8)}...${existingKey.substring(existingKey.length - 8)}`);
  } else {
    console.log("ℹ️  No existing OpenClaw master key found");
    
    // Try to create one
    console.log("\n4️⃣  Attempting to create a test key...");
    const testKey = `test-key-${Date.now()}`;
    const success = await openclawAdapter.setPassword("openclaw", "master-key-test", testKey);
    
    if (success) {
      console.log("✅ Successfully created test key");
      
      // Verify we can read it back
      const retrieved = await openclawAdapter.getPassword("openclaw", "master-key-test");
      if (retrieved === testKey) {
        console.log("✅ Successfully retrieved test key");
      } else {
        console.error("❌ Retrieved key doesn't match!");
      }
      
      // Cleanup
      await openclawAdapter.deletePassword("openclaw", "master-key-test");
      console.log("✅ Cleaned up test key");
    } else {
      console.error("❌ Failed to create test key");
      console.error("\nCommon causes:");
      console.error("  - Keychain is locked");
      console.error("  - User denied access in the dialog");
      console.error("  - No permission to access keychain");
      console.error("\nTo fix:");
      console.error("  1. Open 'Keychain Access' app");
      console.error("  2. Unlock your login keychain");
      console.error("  3. Run this tool again");
    }
  }

  console.log("\n✨ Diagnostic complete!");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
