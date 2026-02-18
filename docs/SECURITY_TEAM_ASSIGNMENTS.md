# 👥 ASSIGNMENTS - OPENCLAW SECURITY TEAM

## 📋 Distribuição de Tarefas

### 🚨 FASE 1: Core Security (Semana 1)

#### Agente A → SEC-001: Remove Default Secret
**Branch:** `feature/SEC-001-remove-default-secret`  
**Dependências:** Nenhuma  
**Prazo:** 2 dias  

**Tarefas:**
1. [ ] Modificar `src/gateway/server-methods/env.ts`
2. [ ] Criar classe `SecurityError` para erros de configuração
3. [ ] Validar presença e força da chave de criptografia
4. [ ] Atualizar documentação
5. [ ] Escrever testes unitários
6. [ ] Escrever testes de integração

**Arquivos a modificar:**
- `src/gateway/server-methods/env.ts`
- `src/errors/security-error.ts` (novo)
- `test/security/env-validation.test.ts` (novo)

**Critérios de aceitação:**
- Erro lançado quando `OPENCLAW_ENV_ENCRYPTION_KEY` não está set
- Erro lançado quando chave tem < 32 caracteres
- Mensagem clara de como gerar chave segura
- Testes passando 100%

---

#### Agente D → SEC-004: CORS Implementation  
**Branch:** `feature/SEC-004-cors-impl`  
**Dependências:** Nenhuma  
**Prazo:** 3 dias

**Tarefas:**
1. [ ] Criar `src/gateway/cors.ts`
2. [ ] Implementar validação de origem
3. [ ] Suportar wildcards em domínios
4. [ ] Handler de preflight OPTIONS
5. [ ] Integrar em `server-http.ts`
6. [ ] Configuração via YAML
7. [ ] Testes completos

**Arquivos:**
- `src/gateway/cors.ts` (novo)
- `src/gateway/server-http.ts` (modificar)
- `src/config/schema.ts` (adicionar cors config)
- `test/gateway/cors.test.ts` (novo)

---

#### Agente G → SEC-007: Rate Limiting
**Branch:** `feature/SEC-007-rate-limiting`  
**Dependências:** Nenhuma  
**Prazo:** 3 dias

**Tarefas:**
1. [ ] Criar `src/gateway/rate-limiter.ts`
2. [ ] Implementar LRU cache para contadores
3. [ ] Headers X-RateLimit-*
4. [ ] Middleware para Express/HTTP
5. [ ] Rate limits por endpoint
6. [ ] Configuração YAML
7. [ ] Testes

**Arquivos:**
- `src/gateway/rate-limiter.ts` (novo)
- `src/gateway/middleware/rate-limit.ts` (novo)
- `src/config/schema.ts` (adicionar rateLimit config)

---

#### Agente K → SEC-011: LLM Security Controls
**Branch:** `feature/SEC-011-llm-security`  
**Dependências:** Nenhuma  
**Prazo:** 4 dias

**Tarefas:**
1. [ ] Criar `src/agents/llm-security.ts`
2. [ ] Implementar detecção de prompt injection
3. [ ] Lista de padrões de ataque
4. [ ] Análise de entropia
5. [ ] Sanitização de input
6. [ ] Validação de tool calls
7. [ ] Integrar em `system-prompt.ts`
8. [ ] Testes

**Arquivos:**
- `src/agents/llm-security.ts` (novo)
- `src/agents/system-prompt.ts` (modificar)
- `test/agents/llm-security.test.ts` (novo)

---

### 🔒 FASE 2: API Security (Semana 2)

#### Agente B → SEC-002: Argon2id Migration
**Branch:** `feature/SEC-002-argon2id-migration`  
**Dependências:** SEC-001 (copiar padrão de error handling)  
**Prazo:** 4 dias

**Tarefas:**
1. [ ] Adicionar dependência `argon2`
2. [ ] Modificar `src/security/credential-vault.ts`
3. [ ] Implementar derivação com Argon2id
4. [ ] Sistema de migração de PBKDF2
5. [ ] Metadata de versionamento
6. [ ] Testes de performance
7. [ ] Documentação de migração

**Arquivos:**
- `package.json` (adicionar argon2)
- `src/security/credential-vault.ts` (modificar)
- `test/security/argon2id.test.ts` (novo)

---

#### Agente E → SEC-005: CSRF Protection
**Branch:** `feature/SEC-005-csrf-protection`  
**Dependências:** SEC-004 (entender padrão de middleware)  
**Prazo:** 3 dias

**Tarefas:**
1. [ ] Criar `src/gateway/csrf.ts`
2. [ ] Geração de tokens seguros
3. [ ] Validação constant-time
4. [ ] Cookies HttpOnly/Secure/SameSite
5. [ ] Middleware de proteção
6. [ ] Integração frontend
7. [ ] Testes

**Arquivos:**
- `src/gateway/csrf.ts` (novo)
- `src/gateway/middleware/csrf.ts` (novo)
- `src/web/auth-store.ts` (adicionar CSRF token)

---

#### Agente H → SEC-008: Security Headers
**Branch:** `feature/SEC-008-security-headers`  
**Dependências:** SEC-004 (padrão de middleware)  
**Prazo:** 2 dias

**Tarefas:**
1. [ ] Criar `src/gateway/security-headers.ts`
2. [ ] CSP Header configurável
3. [ ] HSTS para produção
4. [ ] X-Frame-Options, X-Content-Type-Options
5. [ ] Referrer-Policy, Permissions-Policy
6. [ ] Middleware
7. [ ] Configuração por ambiente
8. [ ] Testes

**Arquivos:**
- `src/gateway/security-headers.ts` (novo)
- `src/gateway/middleware/security-headers.ts` (novo)
- `src/config/schema.ts` (security headers config)

---

#### Agente L → SEC-012: Audit Logging
**Branch:** `feature/SEC-012-audit-logging`  
**Dependências:** SEC-002 (padrão de criptografia)  
**Prazo:** 3 dias

**Tarefas:**
1. [ ] Criar `src/security/audit-logger.ts`
2. [ ] Estrutura de eventos de audit
3. [ ] Buffering e flush assíncrono
4. [ ] Criptografia opcional
5. [ ] Retenção configurável
6. [ ] Sanitização de dados sensíveis
7. [ ] Testes

**Arquivos:**
- `src/security/audit-logger.ts` (novo)
- `src/security/audit-events.ts` (novo)
- `test/security/audit-logger.test.ts` (novo)

---

### 🏗️ FASE 3: Infrastructure (Semana 3)

#### Agente C → SEC-003: Keyring Implementation
**Branch:** `feature/SEC-003-keyring-impl`  
**Dependências:** SEC-002 (Argon2id pronto)  
**Prazo:** 4 dias

**Tarefas:**
1. [ ] Interface `KeyringAdapter`
2. [ ] Implementação macOS (Keychain)
3. [ ] Implementação Windows (Credential Manager)
4. [ ] Implementação Linux (Secret Service)
5. [ ] Fallback para arquivo com warning
6. [ ] Integrar em `credential-vault.ts`
7. [ ] Testes multi-plataforma

**Arquivos:**
- `src/security/keyring/adapter.ts` (novo)
- `src/security/keyring/macos.ts` (novo)
- `src/security/keyring/windows.ts` (novo)
- `src/security/keyring/linux.ts` (novo)
- `src/security/credential-vault.ts` (modificar)

---

#### Agente F → SEC-006: WebSocket Security
**Branch:** `feature/SEC-006-ws-security`  
**Dependências:** SEC-007 (rate limiting)  
**Prazo:** 3 dias

**Tarefas:**
1. [ ] Criar `src/gateway/server/ws-auth.ts`
2. [ ] Validação de origin
3. [ ] Challenge-response authentication
4. [ ] Rate limiting por conexão
5. [ ] Modificar `ws-connection.ts`
6. [ ] Testes de segurança

**Arquivos:**
- `src/gateway/server/ws-auth.ts` (novo)
- `src/gateway/server/ws-connection.ts` (modificar)
- `test/gateway/ws-security.test.ts` (novo)

---

#### Agente I → SEC-009: Audio Validation
**Branch:** `feature/SEC-009-audio-validation`  
**Dependências:** SEC-007 (rate limiting para uploads)  
**Prazo:** 3 dias

**Tarefas:**
1. [ ] Criar `src/media/audio-validator.ts`
2. [ ] Validação de magic bytes
3. [ ] Integração com ffprobe
4. [ ] Scan de malware (ClamAV)
5. [ ] Sandbox para processamento
6. [ ] Rate limiting por usuário
7. [ ] Modificar `audio.ts`
8. [ ] Testes

**Arquivos:**
- `src/media/audio-validator.ts` (novo)
- `src/media/audio.ts` (modificar)
- `test/media/audio-validator.test.ts` (novo)

---

#### Agente M → SEC-013: API Security
**Branch:** `feature/SEC-013-api-security`  
**Dependências:** SEC-004, SEC-007, SEC-008  
**Prazo:** 4 dias

**Tarefas:**
1. [ ] Criar `src/gateway/api-security.ts`
2. [ ] Validação de schema (JSON Schema)
3. [ ] Sanitização de input/output
4. [ ] XSS prevention
5. [ ] SQL injection prevention
6. [ ] Path traversal prevention
7. [ ] Composition de middlewares
8. [ ] Testes

**Arquivos:**
- `src/gateway/api-security.ts` (novo)
- `src/gateway/middleware/security-composition.ts` (novo)
- `test/gateway/api-security.test.ts` (novo)

---

### 🎨 FASE 4: Application Security (Semana 4)

#### Agente J → SEC-010: UI Access Control
**Branch:** `feature/SEC-010-ui-access`  
**Dependências:** SEC-005, SEC-007  
**Prazo:** 3 dias

**Tarefas:**
1. [ ] Criar `src/gateway/ui-auth.ts`
2. [ ] Session management
3. [ ] Timeout de sessão
4. [ ] IP validation opcional
5. [ ] Rate limiting de login
6. [ ] Modificar `control-ui.ts`
7. [ ] Testes

**Arquivos:**
- `src/gateway/ui-auth.ts` (novo)
- `src/gateway/middleware/ui-protection.ts` (novo)
- `src/gateway/control-ui.ts` (modificar)

---

## 🔄 Processo de Trabalho

### Início do Dia
```bash
# 1. Verificar status do coordinator
./scripts/coordinator.sh status

# 2. Sincronizar sua feature
./scripts/coordinator.sh sync SEC-XXX-nome

# 3. Atualizar status
worktree_path="../openbr-worktrees/SEC-XXX-nome"
echo "IN_PROGRESS" > "$worktree_path/.agent-status"
```

### Durante o Dia
- Commit frequente com mensagens claras
- Testar localmente antes de push
- Documentar no CHANGELOG.md

### Fim do Dia
```bash
# 1. Commit de tudo
git add -A
git commit -m "SEC-XXX: progresso do dia - descrição"
git push origin feature/SEC-XXX-nome

# 2. Atualizar status
if [ "$done" == true ]; then
    echo "DONE" > "$worktree_path/.agent-status"
else
    echo "IN_PROGRESS" > "$worktree_path/.agent-status"
fi

# 3. Reportar no canal
# "Agente X: SEC-XXX 80% completo, sem bloqueios"
```

## ✅ Critérios de Conclusão

Cada agente deve garantir:
- [ ] Código segue style guide do projeto
- [ ] Testes unitários >80% coverage
- [ ] Testes de integração passando
- [ ] Sem warnings do linter
- [ ] TypeScript sem erros
- [ ] Documentação atualizada
- [ ] CHANGELOG.md atualizado
- [ ] Arquivo `.agent-status` = "DONE"

## 🆘 Suporte

### Bloqueios Técnicos
1. Tentar resolver por 2 horas
2. Perguntar no canal #sec-team
3. Se não resolver em 4h: escalonar para coordenador

### Conflitos de Merge
```bash
# Se houver conflito durante sync:
git checkout sua-branch
git rebase feature/security-hardening-2025
# Resolver conflitos manualmente
git rebase --continue
```

### Dúvidas sobre Spec
- Consultar: `docs/SECURITY_SPECS.md`
- Perguntar: Canal #sec-team
- Reunião: Daily 9h UTC

---

**Coordenador:** Central Security Team  
**Última atualização:** 2025-02-18  
**Próxima revisão:** Quando Fase 1 completar
