# 🔐 Keychain Troubleshooting Guide

## Problema: "Keychain não encontrado" ou "Não foi possível acessar"

## Solução Rápida

### 1. Verificar se o Keychain está desbloqueado

Abra o aplicativo **Keychain Access** (Acesso ao Chaveiro):
- Pressione `Cmd + Espaço` e digite "Keychain Access"
- Ou vá em: Aplicativos > Utilitários > Keychain Access

Verifique se o chaveiro "login" está desbloqueado:
- Se mostrar um cadeado fechado, clique duas vezes e digite sua senha do macOS

### 2. Testar com o comando security

Abra o Terminal e execute:

```bash
# Testar se o comando security funciona
security find-generic-password -s "openclaw" -a "master-key" -w

# Se não encontrar, criar uma senha de teste
security add-generic-password -s "openclaw-test" -a "test" -w "test123"

# Ler a senha de volta
security find-generic-password -s "openclaw-test" -a "test" -w

# Deletar o teste
security delete-generic-password -s "openclaw-test" -a "test"
```

### 3. Executar diagnóstico do OpenClaw

```bash
cd /Users/ropeixoto/Project/experiments/openbr_assistant
pnpm tsx scripts/keychain-diagnose.ts
```

Isso vai mostrar exatamente qual é o problema.

### 4. Resetar o Keychain (último recurso)

Se nada funcionar, você pode resetar:

```bash
# Deletar a chave do OpenClaw (se existir)
security delete-generic-password -s "openclaw" -a "master-key" 2>/dev/null || true

# Gerar nova chave
export OPENCLAW_ENV_ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "Chave gerada: $OPENCLAW_ENV_ENCRYPTION_KEY"

# Salvar no keychain
security add-generic-password -s "openclaw" -a "master-key" -w "$OPENCLAW_ENV_ENCRYPTION_KEY" -U

# Verificar se salvou
security find-generic-password -s "openclaw" -a "master-key" -w
```

## Problemas Comuns

### ❌ "User canceled the operation"
**Causa:** Você clicou em "Negar" no diálogo do keychain  
**Solução:** 
1. Abra Keychain Access
2. Encontre a entrada "openclaw"
3. Delete ela
4. Tente novamente

### ❌ "The specified item could not be found"
**Causa:** A chave ainda não foi criada  
**Solução:** Execute o comando de geração acima

### ❌ Permission denied
**Causa:** O Terminal não tem permissão para acessar o keychain  
**Solução:**
1. Vá em: Preferências do Sistema > Segurança e Privacidade > Privacidade > Acesso total ao disco
2. Adicione o Terminal (ou iTerm/VS Code) à lista

### ❌ "security: SecKeychainSearchCopyNext: The specified item could not be found"
**Causa:** Normal, significa que a chave não existe ainda  
**Solução:** Crie a chave conforme instruções acima

## Modo Fallback

Se o keychain não funcionar de jeito nenhum, o OpenClaw vai automaticamente usar armazenamento em arquivo:

```
~/.openclaw/keyring/
```

⚠️ **Atenção:** O armazenamento em arquivo é menos seguro que o keychain!

## Verificação Final

Para verificar se está tudo funcionando:

```bash
# 1. Verificar se a variável está setada
echo $OPENCLAW_ENV_ENCRYPTION_KEY

# 2. Testar o OpenClaw
pnpm openclaw config get

# 3. Se der erro, verifique o log
cat ~/.openclaw/logs/openclaw.log | grep -i "keychain\|security\|error"
```

## Suporte

Se continuar com problemas:
1. Execute: `pnpm tsx scripts/keychain-diagnose.ts`
2. Copie a saída
3. Abra uma issue no GitHub com o log
