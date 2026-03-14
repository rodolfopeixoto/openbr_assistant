# 🚀 Migração OpenClaw 2026.1.30 → 2026.3.7

## 📋 Resumo

Esta é uma migração **spec-driven** para atualizar do OpenClaw 2026.1.30 para 2026.3.7, mantendo todas as modificações do Desktop App (M1-M6).

**Total de commits:** 5267  
**Complexidade:** Alta  
**Estimativa:** 3-4 semanas  
**Status:** 🟡 Em planejamento

---

## 📁 Arquivos de Planejamento

| Arquivo | Descrição |
|---------|-----------|
| `specs/active/SPEC-MIGRATION-001.md` | Especificação completa da migração |
| `MIGRATION-PROGRESS.md` | Dashboard de progresso atualizado |
| `scripts/migration-analyze.sh` | Análise de commits por lote |
| `scripts/migration-apply.sh` | Aplicação de commits |
| `scripts/migration-validate.sh` | Validação de lote |
| `scripts/migration-dashboard.sh` | Dashboard visual |

---

## 🎯 Estratégia

A migração é dividida em **11 lotes** de ~500 commits cada:

1. **Lote 1-3:** Fundação e Core (Semana 1)
2. **Lote 4-6:** Features e Canais (Semana 2)
3. **Lote 7-9:** UI e Extensões (Semana 3)
4. **Lote 10-11:** Finalização (Semana 4)

---

## 🛠️ Como Usar

### 1. Analisar Lote
```bash
./scripts/migration-analyze.sh 1
```
Gera relatório de análise do lote 1 (commits 1-500)

### 2. Aplicar Lote
```bash
./scripts/migration-apply.sh 1
```
Cria branch e aplica commits do lote 1

### 3. Validar Lote
```bash
./scripts/migration-validate.sh
```
Roda build, testes e validações

### 4. Ver Progresso
```bash
./scripts/migration-dashboard.sh
```
Mostra dashboard de progresso

---

## ⚠️ Pontos de Atenção

### Desktop App (NÃO PERDER!)
- ✅ M1: Foundation (Tauri + comandos básicos)
- ✅ M2: System Tray (Menu bandeja)
- ✅ M3: Window Management (Atalhos, persistência)
- ✅ M4: Gateway Integration (Health monitoring)
- ✅ M5: Auto-Updater (Verificação de updates)
- ✅ M6: Distribution (CI/CD, builds)

**Arquivos críticos:**
- `apps/desktop/` - Todo o diretório
- `apps/desktop/src-tauri/src/main.rs` - Código Rust
- `apps/desktop/src-tauri/tauri.conf.json` - Configuração
- `.github/workflows/desktop-build.yml` - CI/CD

### Dependências Adicionadas
- `uuid` - UUID generation
- `execa` - Process execution
- `rss-parser` - RSS parsing
- `better-sqlite3` - SQLite nativo

---

## 📊 Progresso

Ver arquivo: `MIGRATION-PROGRESS.md`

```bash
# Dashboard rápido
./scripts/migration-dashboard.sh
```

---

## 🔒 Segurança

### Backups Automáticos
Cada lote cria automaticamente uma tag de backup:
```
migration/backup-001
migration/backup-002
...
```

### Rollback
Se algo der errado:
```bash
# Reverter para backup
git checkout migration/backup-001

# Ou resetar lote atual
git reset --hard HEAD~500
```

---

## ✅ Checklist de Sucesso

Antes de finalizar:

- [ ] Todos os 11 lotes aplicados
- [ ] Build passando (`pnpm build`)
- [ ] Testes unitários passando (`pnpm test`)
- [ ] Testes E2E passando (`pnpm test:e2e`)
- [ ] Desktop build funcionando
- [ ] Gateway inicia sem erros
- [ ] UI acessível
- [ ] CLI funcionando
- [ ] Documentação atualizada

---

## 🆘 Suporte

### Se um lote falhar:
1. Analisar logs de erro
2. Resolver conflitos manualmente
3. Pular commit problemático se necessário
4. Documentar no relatório do lote

### Se build falhar:
1. Verificar dependências (`pnpm install`)
2. Limpar cache (`pnpm clean`)
3. Verificar breaking changes
4. Consultar `SPEC-MIGRATION-001.md`

---

## 📚 Referências

- [Especificação Completa](./specs/active/SPEC-MIGRATION-001.md)
- [OpenClaw Original](https://github.com/openclaw/openclaw)
- [Releases v2026.3.7](https://github.com/openclaw/openclaw/releases/tag/v2026.3.7)

---

**Criado:** 2026-03-10  
**Autor:** AI Assistant  
**Status:** 🟡 Planejamento
