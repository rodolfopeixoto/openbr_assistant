# 🛡️ OPENCLAW SECURITY TEAM - COORDENAÇÃO

## Estrutura de Equipe

### Core Team (Fase 1 - Crítica)
| Agente | Feature | Branch | Status | Dependências |
|--------|---------|--------|--------|--------------|
| **Agente A** | SEC-001: Remove Default Secret | `feature/SEC-001-remove-default-secret` | 🟡 Ready | None |
| **Agente B** | SEC-002: Argon2id Migration | `feature/SEC-002-argon2id-migration` | 🟡 Ready | SEC-001 |
| **Agente C** | SEC-003: Keyring Implementation | `feature/SEC-003-keyring-impl` | 🟡 Ready | SEC-002 |

### API Team (Fase 2 - Web Security)
| Agente | Feature | Branch | Status | Dependências |
|--------|---------|--------|--------|--------------|
| **Agente D** | SEC-004: CORS Implementation | `feature/SEC-004-cors-impl` | 🟡 Ready | None |
| **Agente E** | SEC-005: CSRF Protection | `feature/SEC-005-csrf-protection` | 🟡 Ready | SEC-004 |
| **Agente F** | SEC-006: WebSocket Security | `feature/SEC-006-ws-security` | 🟡 Ready | None |

### Infrastructure Team (Fase 3 - Infra)
| Agente | Feature | Branch | Status | Dependências |
|--------|---------|--------|--------|--------------|
| **Agente G** | SEC-007: Rate Limiting | `feature/SEC-007-rate-limiting` | 🟡 Ready | None |
| **Agente H** | SEC-008: Security Headers | `feature/SEC-008-security-headers` | 🟡 Ready | None |
| **Agente I** | SEC-009: Audio Validation | `feature/SEC-009-audio-validation` | 🟡 Ready | None |

### Application Team (Fase 4 - App Security)
| Agente | Feature | Branch | Status | Dependências |
|--------|---------|--------|--------|--------------|
| **Agente J** | SEC-010: UI Access Control | `feature/SEC-010-ui-access` | 🟡 Ready | SEC-005, SEC-007 |
| **Agente K** | SEC-011: LLM Security | `feature/SEC-011-llm-security` | 🟡 Ready | None |
| **Agente L** | SEC-012: Audit Logging | `feature/SEC-012-audit-logging` | 🟡 Ready | None |
| **Agente M** | SEC-013: API Security | `feature/SEC-013-api-security` | 🟡 Ready | SEC-004, SEC-007 |

## 🔄 Fluxo de Trabalho

### 1. Início de Sprint
```bash
# Cada agente executa no início:
git checkout feature/security-hardening-2025
git pull origin feature/security-hardening-2025
git checkout -b feature/SEC-XXX-nome-da-feature
```

### 2. Durante Desenvolvimento
- **Commits frequentes** com mensagens claras
- **Testes unitários** para cada função
- **Documentação inline** (JSDoc/TSDoc)
- **Sem dependências circulares** entre branches

### 3. Pre-merge Checklist
```bash
# Antes de fazer merge para integration:
✅ pnpm test:unit --pass
✅ pnpm lint --pass
✅ pnpm typecheck --pass
✅ Documentação atualizada
✅ CHANGELOG.md atualizado
```

### 4. Merge Strategy
```bash
# 1. Merge para integration branch
git checkout feature/security-hardening-2025
git merge --no-ff feature/SEC-XXX-nome-da-feature

# 2. Resolver conflitos se necessário
# 3. Executar testes de integração
pnpm test:integration

# 4. Push para remote
git push origin feature/security-hardening-2025
```

## 📝 Convenções de Código

### Commits
```
SEC-XXX: descrição clara do que foi feito

- Detalhe 1
- Detalhe 2

Refs: #issue-number
```

### Nomenclatura
- **Funções:** camelCase, verbos (`validateInput`, `encryptData`)
- **Classes:** PascalCase (`CredentialVault`, `RateLimiter`)
- **Constantes:** UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Arquivos:** kebab-case (`credential-vault.ts`, `rate-limiter.ts`)
- **Branches:** `feature/SEC-XXX-nome-descritivo`

### Documentação Obrigatória
Cada arquivo deve ter:
```typescript
/**
 * @file Nome do arquivo
 * @description Descrição breve
 * @author Agente X
 * @since Data
 * @security Considerações de segurança específicas
 */
```

## 🚫 Regras Anti-Conflito

### 1. Isolamento de Responsabilidades
- Cada agente trabalha em arquivos **distintos** quando possível
- Se modificação compartilhada necessária: **comunicar no canal #sec-team**
- **Nunca editar** `package.json` sem coordenação

### 2. Ordem de Implementação
**Fase 1 (Semana 1):** SEC-001, SEC-004, SEC-007, SEC-011
**Fase 2 (Semana 2):** SEC-002, SEC-005, SEC-008, SEC-012
**Fase 3 (Semana 3):** SEC-003, SEC-006, SEC-009, SEC-013
**Fase 4 (Semana 4):** SEC-010 + Integração

### 3. Pontos de Sincronização
- **Daily standup:** 9h UTC (cada agente reporta progresso)
- **Merge window:** 18h UTC (integração das features do dia)
- **Code review:** Assíncrono, mas responder em < 4h

### 4. Arquivos Compartilhados (Cuidado!)
```
⚠️  ATENÇÃO - Arquivos que requerem coordenação:
- src/gateway/server-http.ts (D, E, H, M)
- src/gateway/server-ws-runtime.ts (F)
- package.json (B, G, I, L)
- src/config/schema.ts (todos)
- src/security/index.ts (A, B, C)
```

## 📊 Dashboard de Progresso

| Fase | Progresso | Status |
|------|-----------|--------|
| Fase 1 - Core | 0% | 🔴 Não iniciada |
| Fase 2 - API | 0% | 🔴 Não iniciada |
| Fase 3 - Infra | 0% | 🔴 Não iniciada |
| Fase 4 - App | 0% | 🔴 Não iniciada |
| **Total** | **0%** | 🔴 **Iniciando** |

## 🎯 Critérios de Conclusão

Cada feature só é considerada **COMPLETA** quando:
- [ ] Código implementado seguindo spec
- [ ] Testes unitários (>80% coverage)
- [ ] Testes de integração
- [ ] Documentação atualizada
- [ ] Code review aprovado
- [ ] Merge para integration branch
- [ ] Sem conflitos com outras features

## 🆘 Escalonamento

Se houver:
- **Conflito de merge:** Chamar Agente Líder
- **Dúvida técnica:** Consultar spec original
- **Bloqueio > 4h:** Escalonar imediatamente
- **Mudança de escopo:** Requer aprovação do time

## 📞 Comunicação

### Canais
- **#sec-general:** Discussões gerais
- **#sec-core:** Fase 1 (A, B, C)
- **#sec-api:** Fase 2 (D, E, F)
- **#sec-infra:** Fase 3 (G, H, I)
- **#sec-app:** Fase 4 (J, K, L, M)

### Status Updates
Template para daily:
```
Agente: X
Feature: SEC-XXX
Progresso: Y%
Bloqueios: None ou descrição
Próximos passos: ...
Precisa de ajuda: Sim/Não
```

---

**Última atualização:** $(date)
**Próximo checkpoint:** Início da Fase 1
