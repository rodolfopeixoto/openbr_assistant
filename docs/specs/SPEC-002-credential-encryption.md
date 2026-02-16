# SPEC-002: Sistema de Criptografia de Credenciais

## 1. Objetivo
Implementar criptografia robusta para armazenamento seguro de credenciais de API, tokens OAuth e chaves privadas, protegendo contra acesso não autorizado e vazamento de dados.

## 2. Requisitos de Segurança

### 2.1 Threat Model
- **Atacante externo**: Acesso remoto ao sistema
- **Atacante local**: Usuário não-privilegiado no mesmo sistema
- **Atacante privilegiado**: Root/administrador
- **Atacante físico**: Acesso ao hardware/armazenamento
- **Atacante de backup**: Acesso a backups não criptografados

### 2.2 Requisitos
1. Criptografia AES-256-GCM (autenticada)
2. Chave mestra protegida por system keyring ou passphrase
3. Proteção contra tampering (HMAC ou AEAD)
4. Key rotation suportado
5. Forward secrecy (compromisso de uma chave não expõe dados antigos)

## 3. Arquitetura

### 3.1 Componentes
```
┌─────────────────────────────────────────────────────────────┐
│                   KEY MANAGEMENT                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ System       │  │ Master Key   │  │ Key Rotation │      │
│  │ Keyring      │  │ Encryption   │  │ Manager      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│              CREDENTIAL ENCRYPTION                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AES-256-GCM  │  │ IV + Auth    │  │ PBKDF2/Argon2│      │
│  │ Encryption   │  │ Tag          │  │ Key Derive   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Algoritmos

#### Criptografia Simétrica
- **Algoritmo**: AES-256-GCM
- **Key Size**: 256 bits
- **Nonce/IV**: 96 bits (12 bytes), único por operação
- **Auth Tag**: 128 bits (16 bytes)
- **Implementation**: Node.js crypto module (OpenSSL)

#### Key Derivation (se usar passphrase)
- **Algoritmo**: Argon2id (preferencial) ou PBKDF2
- **Params**: 
  - Argon2: memory=64MB, iterations=3, parallelism=4
  - PBKDF2: 600,000 iterations (OWASP 2023)

#### Master Key Storage
- **macOS**: Keychain (kSecClassGenericPassword)
- **Windows**: Credential Manager (CredWrite)
- **Linux**: Secret Service API (libsecret)
- **Fallback**: Arquivo criptografado com passphrase

## 4. Implementação

### 4.1 Estrutura de Dados

#### Credencial Criptografada
```typescript
interface EncryptedCredential {
  version: 1;
  encrypted: string;           // Base64: iv (12) + authTag (16) + ciphertext
  salt?: string;              // Base64, para key derivation
  algorithm: "aes-256-gcm";
  keyId: string;              // Identificador da chave mestra
  createdAt: string;          // ISO 8601
}
```

#### Exemplo de Payload
```json
{
  "profiles": {
    "openai:default": {
      "type": "api_key",
      "provider": "openai",
      "key": {
        "version": 1,
        "encrypted": "base64(iv+tag+ciphertext)",
        "algorithm": "aes-256-gcm",
        "keyId": "master-key-2024-01",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    }
  }
}
```

### 4.2 API

```typescript
// src/security/credential-vault.ts

export class CredentialVault {
  /**
   * Inicializa o vault, obtendo ou criando master key
   */
  static async initialize(): Promise<CredentialVault>;
  
  /**
   * Criptografa uma credencial
   */
  async encrypt(plaintext: string): Promise<EncryptedCredential>;
  
  /**
   * Descriptografa uma credencial
   */
  async decrypt(credential: EncryptedCredential): Promise<string>;
  
  /**
   * Rotaciona a chave mestra
   */
  async rotateKey(): Promise<void>;
  
  /**
   * Verifica integridade do vault
   */
  async verifyIntegrity(): Promise<boolean>;
}
```

### 4.3 Fluxo de Criptografia

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Plaintext   │────▶│  AES-256-GCM │────▶│  Ciphertext  │
│  (API Key)   │     │  + IV + Tag  │     │  (Storage)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │              ┌─────┴─────┐              │
       │              │           │              │
┌──────┴──────┐      ▼           ▼      ┌──────┴──────┐
│  Master Key │◀─── IV (96b)  Auth Tag   │  Salt       │
│  (Keyring)  │      │           │       │  (Argon2)   │
└─────────────┘      └─────┬─────┘       └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  Ciphertext │
                    │  (variável) │
                    └─────────────┘
```

## 5. Proteções

### 5.1 Contra Acesso de Root
**Problema**: Root pode ler qualquer arquivo.
**Solução**: 
- Usar system keyring (keychain/credential manager)
- Require user authentication para acessar chave
- Memory-only key (não persistida em disco)

### 5.2 Contra Memory Dumps
**Problema**: Chave pode ser extraída de RAM.
**Solução**:
- Zeroize memory após uso
- Usar mlock para prevenir swap
- Minimize tempo de exposição da chave

### 5.3 Contra Backup Exposure
**Problema**: Backups podem conter credenciais descriptografadas.
**Solução**:
- Nunca fazer backup da chave mestra (regenerável)
- Criptografar backups
- Alertar se backup contém credenciais

### 5.4 Contra Brute Force
**Problema**: Se usar passphrase, pode ser brute-forcada.
**Solução**:
- Argon2id com parâmetros robustos
- Rate limiting em tentativas de descriptografia
- Bloqueio após tentativas falhas

## 6. Fallback e Recuperação

### 6.1 System Keyring Indisponível
Se o keyring do sistema não estiver disponível:
1. Solicitar passphrase do usuário
2. Derivar chave com Argon2
3. Armazenar hash da chave para verificação
4. Alertar usuário sobre menor segurança

### 6.2 Recuperação de Chave Perdida
**IMPORTANTE**: Se a master key for perdida, as credenciais não podem ser recuperadas.
**Mitigação**:
- Backup de credenciais em password manager externo
- Reconfiguração necessária
- Exportação preventiva (com aviso de segurança)

## 7. Migração de Dados Legados

### 7.1 Detecção de Credenciais em Texto Plano
```typescript
function detectPlaintextCredentials(store: AuthProfileStore): boolean {
  for (const [key, profile] of Object.entries(store.profiles)) {
    if (typeof profile.key === 'string' && !profile.key.encrypted) {
      return true;
    }
  }
  return false;
}
```

### 7.2 Processo de Migração
1. Detectar credenciais não criptografadas
2. Inicializar vault
3. Criptografar cada credencial
4. Salvar novo formato
5. Fazer backup do arquivo antigo
6. Alertar usuário da migração

## 8. Critérios de Aceitação
- [ ] Criptografia AES-256-GCM implementada
- [ ] Integração com system keyring (macOS/Windows/Linux)
- [ ] Fallback para passphrase funcional
- [ ] Migração automática de credenciais legadas
- [ ] Zeroize de memória implementado
- [ ] Rate limiting em tentativas de descriptografia
- [ ] Testes de penetração (tentativa de quebra)
- [ ] Documentação de segurança

## 9. Dependências
- Node.js crypto module
- keytar (para system keyring cross-platform)
- argon2 (para key derivation)

## 10. Estimativa
- **Desenvolvimento**: 4-6 dias
- **Testes de segurança**: 2-3 dias
- **Auditoria**: 1 dia
- **Total**: 7-10 dias
