#!/bin/bash
# master-consolidator.sh - Consolida TODAS as branches na develop
# Versão 2026.3.7

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

TARGET_VERSION="2026.3.7"
CONSOLIDATION_BRANCH="consolidation/v$TARGET_VERSION-$(date +%Y%m%d)"

echo "=========================================="
echo "🚀 CONSOLIDAÇÃO MASTER - OpenClaw $TARGET_VERSION"
echo "=========================================="
echo "Data: $(date)"
echo "Branch de consolidação: $CONSOLIDATION_BRANCH"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

log() { echo -e "${BLUE}[MASTER]${NC} $1"; }
success() { echo -e "${GREEN}[MASTER]${NC} $1"; }
warn() { echo -e "${YELLOW}[MASTER]${NC} $1"; }
error() { echo -e "${RED}[MASTER]${NC} $1"; }
phase() { 
    echo ""
    echo -e "${WHITE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}  $1${NC}"
    echo -e "${WHITE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# FASE 1: Preparação
phase "FASE 1: PREPARAÇÃO"

log "Limpando arquivos temporários..."
rm -f .merge-results.txt .merge-failed.txt .branches-*.txt

log "Atualizando branches remotas..."
git fetch --all --prune

log "Gerando lista de branches..."
git branch -r | grep -E "origin/(feat|fix)/" | \
    grep -v -E "(security|sandbox|traversal|lfi)" | \
    sed 's/^[[:space:]]*origin\///' > .branches-all.txt

TOTAL_BRANCHES=$(wc -l < .branches-all.txt)
log "Total de branches para processar: $TOTAL_BRANCHES"

# Criar branch de consolidação
log "Criando branch de consolidação..."
git checkout -b "$CONSOLIDATION_BRANCH" develop

# FASE 2: Processamento em Paralelo
phase "FASE 2: PROCESSAMENTO PARALELO"

NUM_AGENTS=4
BATCH_SIZE=$((TOTAL_BRANCHES / NUM_AGENTS + 1))

log "Iniciando $NUM_AGENTS agentes..."
log "Lotes de ~$BATCH_SIZE branches por agente"

# Dividir branches em lotes
split -l $BATCH_SIZE .branches-all.txt .branches-batch-

# Iniciar agentes em paralelo
AGENT_PIDS=()
for i in $(seq 1 $NUM_AGENTS); do
    BATCH_FILE=".branches-batch-$(printf '%c' $(printf '%d' $((96 + i))))"
    if [ -f "$BATCH_FILE" ]; then
        log "Iniciando Agente-$i..."
        BRANCHES=$(cat "$BATCH_FILE" | tr '\n' ' ')
        ./scripts/agent-merger.sh $i $BRANCHES &
        AGENT_PIDS+=($!)
    fi
done

# Agente Revisor - monitora conflitos
log "Iniciando Agente Revisor..."
(
    while [ ${#AGENT_PIDS[@]} -gt 0 ]; do
        sleep 10
        
        # Verificar conflitos
        if [ -f .merge-failed.txt ]; then
            local failed_count=$(wc -l < .merge-failed.txt)
            if [ $failed_count -gt 0 ]; then
                warn "⚠️  Revisor: $failed_count branches com falhas detectadas"
            fi
        fi
        
        # Verificar progresso
        if [ -f .merge-results.txt ]; then
            local processed=$(wc -l < .merge-results.txt)
            local success=$(grep "^SUCCESS:" .merge-results.txt | wc -l)
            log "📊 Revisor: $processed processadas, $success sucessos"
        fi
    done
) &
REVIEWER_PID=$!

# Aguardar todos os agentes
log "Aguardando agentes concluírem..."
for pid in ${AGENT_PIDS[@]}; do
    wait $pid
    log "Agente concluído (PID: $pid)"
done

kill $REVIEWER_PID 2>/dev/null || true

# FASE 3: Resultados
phase "FASE 3: RESULTADOS DO MERGE"

if [ -f .merge-results.txt ]; then
    SUCCESS_COUNT=$(grep "^SUCCESS:" .merge-results.txt | wc -l)
    FAILED_COUNT=$(grep "^FAILED:" .merge-results.txt | wc -l)
    TOTAL_PROCESSED=$((SUCCESS_COUNT + FAILED_COUNT))
    
    success "✅ Sucessos: $SUCCESS_COUNT"
    
    if [ $FAILED_COUNT -gt 0 ]; then
        warn "⚠️  Falhas: $FAILED_COUNT"
        warn "Branches com falha:"
        grep "^FAILED:" .merge-results.txt | while read line; do
            branch=$(echo "$line" | cut -d: -f2)
            conflicts=$(echo "$line" | cut -d: -f3)
            warn "  - $branch ($conflicts conflitos)"
        done
    fi
else
    error "❌ Nenhum resultado encontrado"
    exit 1
fi

# FASE 4: Validação
phase "FASE 4: VALIDAÇÃO"

log "Instalando dependências..."
pnpm install >/dev/null 2>&1 || {
    error "❌ Falha ao instalar dependências"
    exit 1
}

log "Executando build..."
if pnpm build >/tmp/build-consolidation.log 2>&1; then
    success "✅ Build passou!"
else
    error "❌ Build falhou!"
    error "Verifique: /tmp/build-consolidation.log"
    
    # Tentar corrigir conflitos TypeScript
    warn "Tentando corrigir conflitos TypeScript..."
    ./scripts/resolve-ts-conflicts.sh 2>/dev/null || true
    
    # Tentar build novamente
    if pnpm build >/tmp/build-consolidation2.log 2>&1; then
        success "✅ Build corrigido e passou!"
    else
        error "❌ Build ainda falhando após correções"
        exit 1
    fi
fi

# FASE 5: Atualizar Versão
phase "FASE 5: ATUALIZAÇÃO DE VERSÃO"

log "Atualizando versão para $TARGET_VERSION..."

# Atualizar package.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$TARGET_VERSION\"/" package.json
rm -f package.json.bak

# Commit das alterações
git add -A
git commit -m "release($TARGET_VERSION): consolidate all branches

## Consolidação Completa - v$TARGET_VERSION

### Branches Integradas:
- Sucessos: $SUCCESS_COUNT
- Falhas: $FAILED_COUNT
- Total Processado: $TOTAL_PROCESSED

### Versão:
- Anterior: 2026.1.30
- Nova: $TARGET_VERSION

### Build:
✅ Compilando sem erros

### Notas:
Todas as branches de features e fixes (exceto security já na develop)
foram consolidadas nesta branch.

Data: $(date)" || warn "Nada para commitar"

# FASE 6: Merge na Develop
phase "FASE 6: MERGE NA DEVELOP"

log "Fazendo merge na develop..."
git checkout develop
git merge "$CONSOLIDATION_BRANCH" --no-ff -m "merge(consolidation): v$TARGET_VERSION

Integração completa de $SUCCESS_COUNT branches.
Versão atualizada: $TARGET_VERSION

Closes: branch consolidation project" || {
    warn "⚠️  Merge automático falhou, tentando manual..."
    git merge "$CONSOLIDATION_BRANCH" --no-ff --strategy-option=theirs -m "merge(consolidation): v$TARGET_VERSION (resolved)"
}

success "✅ Merge na develop concluído!"

# FASE 7: Cleanup
phase "FASE 7: LIMPEZA"

log "Removendo arquivos temporários..."
rm -f .merge-results.txt .merge-failed.txt .branches-*.txt
rm -rf .parallel-work

log "Branches de trabalho mantidas para referência:"
git branch | grep consolidation

# FASE 8: Resumo Final
phase "FASE 8: RESUMO FINAL"

echo -e "${WHITE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${WHITE}║           ✅ CONSOLIDAÇÃO CONCLUÍDA!                       ║${NC}"
echo -e "${WHITE}╠════════════════════════════════════════════════════════════╣${NC}"
printf "${WHITE}║  Versão: %-50s ║${NC}\n" "$TARGET_VERSION"
printf "${WHITE}║  Branches integradas: %-37s ║${NC}\n" "$SUCCESS_COUNT"
printf "${WHITE}║  Build: %-50s ║${NC}\n" "✅ PASSOU"
printf "${WHITE}║  Branch: %-49s ║${NC}\n" "develop"
echo -e "${WHITE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

success "🎉 OpenClaw v$TARGET_VERSION consolidado com sucesso!"
echo ""
log "Próximo passo:"
log "  git push origin develop"
log "  git push origin main (após testes)"
