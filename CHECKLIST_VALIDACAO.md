# CHECKLIST_VALIDACAO.md
# Checklist de Validação Pós-Merge

**Data:** $(date)  
**Branch:** modern/develop  
**Objetivo:** Verificar se o merge foi bem-sucedido e nada quebrou

---

## ✅ CHECKLIST DE VERIFICAÇÃO

### 1. Estrutura do Repositório
- [ ] Branch modern/develop existe
- [ ] Commits organizados corretamente
- [ ] Não há arquivos não commitados
- [ ] Não há conflitos remanescentes

### 2. Build do Desktop App
- [ ] cargo check passa
- [ ] cargo build --release passa
- [ ] Binário é gerado
- [ ] Tamanho do binário é adequado

### 3. Build do Core (TypeScript)
- [ ] pnpm install funciona
- [ ] pnpm build funciona
- [ ] Não há erros críticos

### 4. Extensões Enterprise
- [ ] Estrutura de diretórios existe
- [ ] Arquivos estão presentes
- [ ] package.json válido

### 5. CI/CD
- [ ] Workflows estão presentes
- [ ] Estrutura YAML é válida

### 6. Integridade
- [ ] Não há marcações de conflito
- [ ] Não há arquivos temporários
- [ ] Permissões estão corretas

---

## COMANDOS DE VALIDAÇÃO

```bash
# 1. Verificar branch e commits
git branch -v
git log --oneline -10

# 2. Verificar status
git status
git status --short

# 3. Buscar conflitos remanescentes
grep -r "<<<<<<< HEAD" --include="*.ts" --include="*.js" --include="*.json" . 2>/dev/null | wc -l

# 4. Build Desktop
cd apps/desktop/src-tauri
cargo check
cargo build --release

# 5. Verificar binário
ls -lh target/release/openbr-desktop

# 6. Verificar extensões
ls -la extensions/@openbr-enterprise/
find extensions/@openbr-enterprise -name "package.json" | wc -l

# 7. Verificar CI/CD
ls -la .github/workflows/
```

---

## CRITÉRIOS DE SUCESSO

✅ **APROVADO** se:
- Todos os builds passam
- Não há erros críticos
- Não há conflitos remanescentes
- Binário é gerado corretamente

⚠️ **ATENÇÃO** se:
- Há warnings (não críticos)
- Build demora mais que o normal
- Alguns testes falham

❌ **REPROVADO** se:
- Build quebra
- Há conflitos não resolvidos
- Funcionalidades críticas não funcionam
- Erros de runtime
