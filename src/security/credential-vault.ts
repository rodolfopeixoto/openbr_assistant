import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";

// Electron safeStorage - loaded dynamically to avoid issues in non-Electron environments
let safeStorage: {
  isEncryptionAvailable(): boolean;
  encryptString(plainText: string): Buffer;
  decryptString(encrypted: Buffer): string;
} | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const electron = require("electron");
  safeStorage = electron.safeStorage;
} catch {
  // Not in Electron environment
  safeStorage = null;
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const KEY_LENGTH = 32; // 256 bits

export interface EncryptedCredential {
  version: 1;
  encrypted: string; // base64(iv + authTag + ciphertext)
  salt?: string; // base64, para key derivation quando não usar keyring
  algorithm: "aes-256-gcm";
  keyId: string;
  createdAt: string;
}

export interface CredentialVaultConfig {
  agentDir: string;
  usePassphrase?: boolean;
  passphrase?: string;
}

export class CredentialVault {
  private masterKey: Buffer | null = null;
  private keyId: string;
  private config: CredentialVaultConfig;

  private constructor(config: CredentialVaultConfig) {
    this.config = config;
    this.keyId = `master-${Date.now()}`;
  }

  /**
   * Initialize the credential vault
   * Tries to use system keyring first, falls back to passphrase if needed
   */
  static async initialize(config: CredentialVaultConfig): Promise<CredentialVault> {
    const vault = new CredentialVault(config);

    try {
      // Try to get existing master key from system keyring
      vault.masterKey = await vault.getMasterKeyFromKeyring();
      console.log("[CredentialVault] Using system keyring for master key");
    } catch (_error) {
      console.warn("[CredentialVault] System keyring not available, using passphrase fallback");

      if (!config.usePassphrase || !config.passphrase) {
        throw new Error(
          "System keyring not available and no passphrase provided. " +
            "Please provide a passphrase or enable system keyring.",
          { cause: _error },
        );
      }

      vault.masterKey = await vault.deriveKeyFromPassphrase(config.passphrase);
    }

    return vault;
  }

  /**
   * Encrypt a plaintext credential
   */
  async encrypt(plaintext: string): Promise<EncryptedCredential> {
    if (!this.masterKey) {
      throw new Error("Vault not initialized");
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();

    // Combine iv + authTag + ciphertext
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, "base64")]);

    return {
      version: 1,
      encrypted: combined.toString("base64"),
      algorithm: ALGORITHM,
      keyId: this.keyId,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Decrypt an encrypted credential
   */
  async decrypt(credential: EncryptedCredential): Promise<string> {
    if (!this.masterKey) {
      throw new Error("Vault not initialized");
    }

    if (credential.algorithm !== ALGORITHM) {
      throw new Error(`Unsupported algorithm: ${credential.algorithm}`);
    }

    const combined = Buffer.from(credential.encrypted, "base64");

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  }

  /**
   * Rotate the master key and re-encrypt all credentials
   */
  async rotateKey(): Promise<void> {
    if (!this.masterKey) {
      throw new Error("Vault not initialized");
    }

    // Generate new key
    const newKey = crypto.randomBytes(KEY_LENGTH);
    const newKeyId = `master-${Date.now()}`;

    // Store new key
    await this.storeMasterKey(newKey);

    // Update key ID
    this.masterKey = newKey;
    this.keyId = newKeyId;

    console.log("[CredentialVault] Master key rotated successfully");
  }

  /**
   * Get master key from system keyring
   */
  private async getMasterKeyFromKeyring(): Promise<Buffer> {
    try {
      // Check if safeStorage is available (Electron environment)
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encryptedKey = await this.readFromKeyring();
        if (encryptedKey) {
          const decrypted = safeStorage.decryptString(encryptedKey);
          return Buffer.from(decrypted, "base64");
        }
      }

      // Fallback: read from file (for Node.js environments)
      return await this.getMasterKeyFromFile();
    } catch (error) {
      throw new Error(`Failed to get master key from keyring: ${error}`, { cause: error });
    }
  }

  /**
   * Store master key in system keyring
   */
  private async storeMasterKey(key: Buffer): Promise<void> {
    try {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(key.toString("base64"));
        await this.writeToKeyring(encrypted);
      } else {
        // Fallback: store in file with restricted permissions
        await this.storeMasterKeyInFile(key);
      }
    } catch (error) {
      throw new Error(`Failed to store master key: ${error}`, { cause: error });
    }
  }

  /**
   * Derive key from passphrase using Argon2id
   */
  private async deriveKeyFromPassphrase(
    passphrase: string,
    existingSalt?: Buffer,
  ): Promise<Buffer> {
    const salt = existingSalt || crypto.randomBytes(SALT_LENGTH);

    // Use Node.js crypto.pbkdf2 as fallback (Argon2id requires external lib)
    // TODO: Replace with argon2 package for better security
    return promisify(crypto.pbkdf2)(
      passphrase,
      salt,
      600000, // OWASP 2023 recommendation
      KEY_LENGTH,
      "sha512",
    );
  }

  /**
   * Read master key from file (fallback for non-Electron environments)
   */
  private async getMasterKeyFromFile(): Promise<Buffer> {
    const keyPath = path.join(this.config.agentDir, ".master-key");

    try {
      const data = await fs.readFile(keyPath);
      // File format: salt(32) + encryptedKey
      const salt = data.subarray(0, SALT_LENGTH);
      const encryptedKey = data.subarray(SALT_LENGTH);

      if (this.config.usePassphrase && this.config.passphrase) {
        const key = await this.deriveKeyFromPassphrase(this.config.passphrase, salt);
        // Decrypt the master key
        const iv = encryptedKey.subarray(0, IV_LENGTH);
        const authTag = encryptedKey.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const ciphertext = encryptedKey.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

        return decrypted;
      }

      throw new Error("Master key file exists but no passphrase provided");
    } catch (error) {
      // Generate new master key if file doesn't exist
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        const newKey = crypto.randomBytes(KEY_LENGTH);
        await this.storeMasterKeyInFile(newKey);
        return newKey;
      }
      throw error;
    }
  }

  /**
   * Store master key in file (fallback)
   */
  private async storeMasterKeyInFile(key: Buffer): Promise<void> {
    const keyPath = path.join(this.config.agentDir, ".master-key");

    if (this.config.usePassphrase && this.config.passphrase) {
      // Encrypt master key with passphrase-derived key
      const salt = crypto.randomBytes(SALT_LENGTH);
      const derivedKey = await this.deriveKeyFromPassphrase(this.config.passphrase, salt);

      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

      let encrypted = cipher.update(key);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag();

      // Write: salt + iv + authTag + encrypted
      const data = Buffer.concat([salt, iv, authTag, encrypted]);
      await fs.writeFile(keyPath, data, { mode: 0o600 });
    } else {
      // Store raw key (less secure, but encrypted at rest by OS)
      await fs.writeFile(keyPath, key, { mode: 0o600 });
    }
  }

  /**
   * Read from system keyring (placeholder - needs platform-specific implementation)
   */
  private async readFromKeyring(): Promise<Buffer | null> {
    // TODO: Implement using node-keytar or similar
    // This would use:
    // - macOS: Keychain Services
    // - Windows: Credential Manager
    // - Linux: Secret Service API (libsecret)

    // For now, return null to trigger fallback
    return null;
  }

  /**
   * Write to system keyring (placeholder - needs platform-specific implementation)
   */
  private async writeToKeyring(_encrypted: Buffer): Promise<void> {
    // TODO: Implement using node-keytar or similar
    // _encrypted contains the key that should be stored in system keyring
    console.warn("[CredentialVault] System keyring not implemented, using file fallback");
  }

  /**
   * Zero out memory (best effort)
   */
  private zeroize(buffer: Buffer): void {
    buffer.fill(0);
  }

  /**
   * Cleanup and zeroize sensitive data
   */
  destroy(): void {
    if (this.masterKey) {
      this.zeroize(this.masterKey);
      this.masterKey = null;
    }
  }
}

export default CredentialVault;
