// Re-export credential vault from security module for service layer access
export {
  CredentialVault,
  type EncryptedCredential,
  type CredentialVaultConfig,
} from "../security/credential-vault.js";
