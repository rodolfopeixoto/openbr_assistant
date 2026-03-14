# 📋 PLANO DE INTEGRAÇÃO FUTURA - 145 Branches Pendentes

## 🎯 VISÃO GERAL

**Objetivo:** Integrar gradualmente as 145 branches pendentes na develop conforme necessidade.

**Status Atual:**
- ✅ 38 branches já consolidadas (incluindo todas as de segurança)
- ⏳ 145 branches pendentes com conflitos
- 📄 Lista completa: `.pending-branches-complete.txt`

---

## 📊 PRIORIZAÇÃO DAS BRANCHES

### 🔴 Prioridade 1 - Features Críticas
Estas trazem funcionalidades importantes:

```
feat/antigravity-integration          # Integração com Google Antigravity
feat/chat-ux-improvements               # Melhorias de UX no chat
feat/llm-task-tool                      # Ferramenta de tarefas LLM
feat/lobster-plugin                     # Plugin Lobster
feat/mattermost-channel                 # Canal Mattermost
feat/models-command                     # Comando de modelos
feat/telegram-dm-threads                # Threads no Telegram
feat/telegram-link-preview-config       # Preview de links Telegram
```

### 🟡 Prioridade 2 - Fixes Importantes
Correções de bugs significativos:

```
fix/audio-text-extraction-bypass        # Bypass de extração de áudio
fix/gemini-cli-oauth-auto-credentials   # OAuth Gemini
fix/gemini-compatibility                # Compatibilidade Gemini
fix/discord-exec-resolvedpath-validation # Validação Discord
fix/chrome-restore-prompt               # Restauração Chrome
fix/telegram-node22-network-stability   # Estabilidade Telegram
```

### ⚪ Prioridade 3 - Outras Features
Funcionalidades adicionais:

```
feat/venice-provider                    # Provedor Venice
feat/web-search-freshness               # Busca web
feat/swift6-compatibility               # Swift 6
feat/slack-dm-reply-to-mode             # Modo reply Slack
feat/plan-mode                          # Modo planejamento
```

### ⚫ Prioridade 4 - Fixes Menores
Pequenas correções:

```
fix/ui-save-button-1609                 # Botão salvar UI
fix/tui-token-refresh                   # Refresh token TUI
fix/telegram-caption-split              # Split de captions
```

---

## 🛠️ MÉTODO DE INTEGRAÇÃO

### Opção 1: Integração Individual (Recomendado para features importantes)

```bash
# 1. Ir para develop
cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw
git checkout develop
git pull origin develop

# 2. Escolher uma branch (exemplo: feat/antigravity-integration)
BRANCH="feat/antigravity-integration"

# 3. Tentar merge
git merge origin/$BRANCH --no-ff -m "merge: integrate $BRANCH"

# Se falhar (conflitos):
# - Abrir cada arquivo conflitante
# - Resolver manualmente (escolher código correto)
# - Remover marcadores <<<<<<< ======= >>>>>>>

# 4. Após resolver:
git add .
git commit -m "merge: integrate $BRANCH (resolved conflicts)"

# 5. Validar
pnpm build
pnpm test

# 6. Push
git push origin develop
```

### Opção 2: Integração em Lote (Para fixes pequenos)

```bash
# Usar o script já criado
./scripts/smart-consolidate.sh

# Este script tenta integrar automaticamente e pula as que falham
# Resultado: apenas as que funcionam são integradas
```

---

## 🔧 RESOLUÇÃO DE CONFLITOS

### Tipos de Conflitos Comuns:

1. **CHANGELOG.md**
   - Sempre usar a versão mais recente
   - Adicionar entradas novas no topo

2. **package.json / pnpm-lock.yaml**
   - Usar `git checkout --theirs` (versão da branch)
   - Depois rodar `pnpm install` para atualizar

3. **Arquivos TypeScript (.ts)**
   - Analisar ambas as versões
   - Manter imports necessários de ambos
   - Remover código duplicado
   - Usar `./scripts/conflict-checker.sh` para ajudar

4. **Arquivos de UI (.css, .html)**
   - Geralmente manter a versão mais completa
   - Verificar se estilos não se sobrepoem

### Script Auxiliar:

```bash
# Resolver conflitos automaticamente quando possível
./scripts/conflict-checker.sh ./src
```

---

## 📈 CRONOGRAMA SUGERIDO

### Semana 1: Prioridade 1 (8 branches)
- Integrar as 8 features críticas uma por dia
- Tempo estimado: 2-3 horas por branch
- Total: 16-24 horas

### Semana 2: Prioridade 2 (10 branches)
- Integrar fixes importantes
- Tempo estimado: 1-2 horas por branch
- Total: 10-20 horas

### Semana 3+: Prioridades 3 e 4
- Continuar conforme necessidade
- Ou deixar para quando houver demanda específica

---

## ✅ CHECKLIST POR BRANCH

Antes de fazer merge:
- [ ] Verificar o que a branch faz (`git log --oneline origin/nome-branch`)
- [ ] Ler descrição no CHANGELOG se houver
- [ ] Garantir que develop está atualizada

Durante o merge:
- [ ] Resolver conflitos cuidadosamente
- [ ] Manter código de ambas as partes quando necessário
- [ ] Não deletar funcionalidades existentes

Após o merge:
- [ ] Rodar `pnpm build` - deve passar
- [ ] Rodar `pnpm test` - idealmente passar (ou pelo menos não quebrar mais)
- [ ] Fazer commit com mensagem clara
- [ ] Push para origin develop
- [ ] Marcar na lista como integrada

---

## 🎯 ESTRATÉGIA RECOMENDADA

### Abordagem Minimalista (Recomendada):
```
1. Integrar apenas quando precisar de uma funcionalidade específica
2. Não tentar integrar tudo de uma vez
3. Fazer backup antes de cada merge
4. Testar sempre após integrar
```

### Abordagem Completa:
```
1. Separar 2-3 semanas exclusivamente para isso
2. Integrar 5-10 branches por dia
3. Revisar cada uma cuidadosamente
4. Manter log de quais foram integradas
```

---

## 📝 REGISTRO DE PROGRESSO

Criar arquivo para acompanhar:

```bash
# Criar arquivo de registro
cat > INTEGRATION_PROGRESS.md << 'EOF'
# Progresso de Integração das Branches Pendentes

## Integradas ✅
- [x] feat/xxx (data: XX/XX/XXXX)
- [x] fix/xxx (data: XX/XX/XXXX)

## Tentadas mas Falharam ❌
- [ ] feat/xxx (motivo: conflitos em X arquivos)

## Próximas a Tentar ⏳
- [ ] feat/antigravity-integration
- [ ] feat/chat-ux-improvements
EOF
```

---

## 🚨 CUIDADOS IMPORTANTES

1. **Nunca fazer merge na main diretamente**
   - Sempre usar develop primeiro
   - Testar na develop antes de ir para main

2. **Fazer backup antes**
   ```bash
   git branch backup-develop-$(date +%Y%m%d)
   ```

3. **Não integrar mais de 3 branches por dia**
   - Fica difícil rastrear o que funcionou
   - Se quebrar, não sabe qual causou

4. **Manter a lista atualizada**
   - Remover branches já integradas do `.pending-branches-complete.txt`
   - Adicionar notas sobre problemas encontrados

---

## 💻 COMANDOS RÁPIDOS

```bash
# Ver lista de pendentes
cat .pending-branches-complete.txt | head -20

# Tentar integrar uma específica
BRANCH="feat/nome-da-branch"
git checkout develop
git merge origin/$BRANCH --no-ff

# Se der erro, ver conflitos
git diff --name-only --diff-filter=U

# Resolver conflitos de TS automaticamente
./scripts/conflict-checker.sh ./src

# Validar build
pnpm build

# Commit e push
git add -A && git commit -m "merge: integrate $BRANCH"
git push origin develop
```

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verificar logs: `git log --oneline -10`
2. Ver status: `git status`
3. Abortar se necessário: `git merge --abort`
4. Restaurar backup: `git reset --hard backup-develop-XXXX`

---

**Data de criação:** $(date)
**Versão atual:** v2026.3.7
**Branches pendentes:** 145
**Documento:** PLANO_INTEGRACAO_FUTURA.md
