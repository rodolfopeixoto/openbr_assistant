// Re-export credential vault from security module for service layer access
export {
  CredentialVault,
  type EncryptedCredential,
  type CredentialVaultConfig,
  type CredentialVaultMetadata,
} from "../security/credential-vault.js";
