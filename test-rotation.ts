import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { CredentialVault } from "./src/security/credential-vault";

async function test() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-"));
  console.log("Temp dir:", tempDir);
  
  const vault = await CredentialVault.initialize({
    agentDir: tempDir,
    usePassphrase: true,
    passphrase: "test-pass",
  });
  
  console.log("Initial keyId:", (vault as any).keyId);
  console.log("Initial masterKey:", (vault as any).masterKey?.toString("hex").slice(0, 16) + "...");
  console.log("Key history size:", (vault as any).keyHistory.size);
  
  const plaintext = "test-data";
  const encrypted = await vault.encrypt(plaintext);
  console.log("Encrypted with keyId:", encrypted.keyId);
  
  console.log("\nRotating key...");
  await vault.rotateKey();
  
  console.log("After rotation keyId:", (vault as any).keyId);
  console.log("After rotation masterKey:", (vault as any).masterKey?.toString("hex").slice(0, 16) + "...");
  console.log("Key history size:", (vault as any).keyHistory.size);
  console.log("Key history keys:", Array.from((vault as any).keyHistory.keys()));
  
  console.log("\nTrying to decrypt...");
  console.log("Credential keyId:", encrypted.keyId);
  const foundKey = (vault as any).keyHistory.get(encrypted.keyId);
  console.log("Found key in history:", foundKey ? "yes" : "no");
  
  try {
    const decrypted = await vault.decrypt(encrypted);
    console.log("Decrypted:", decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
  }
  
  vault.destroy();
  await fs.rm(tempDir, { recursive: true });
}

test();
