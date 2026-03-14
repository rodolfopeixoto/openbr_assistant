#!/bin/bash
# agent-fixes.sh - Agente Dev: Especialista em Fixes

set -e

AGENT_NAME="Agent-Fixes"
PRIORITY="MÉDIO"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
NC='\033[0m'

log_info() { echo -e "${ORANGE}[$AGENT_NAME]${NC} $1"; }
log_success() { echo -e "${GREEN}[$AGENT_NAME]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[$AGENT_NAME]${NC} $1"; }
log_error() { echo -e "${RED}[$AGENT_NAME]${NC} $1"; }

echo "=========================================="
echo "🔧 $AGENT_NAME - MERGE DE FIXES"
echo "   Prioridade: $PRIORITY"
echo "=========================================="

# Buscar branches de fixes (não de segurança)
log_info "Buscando branches de fixes..."

BRANCHES_FILE=".agent-fixes-branches.txt"
echo "# Branches de fixes - gerado automaticamente" > "$BRANCHES_FILE"

# Pegar fixes que não são de segurança
git branch -r | grep "origin/fix/" | grep -v -E "(sandbox|traversal|lfi|security|auth|bypass|injection|xss|csrf)" | sed 's/origin\///' >> "$BRANCHES_FILE" 2>/dev/null || true

# Remover duplicados
sort -u "$BRANCHES_FILE" -o "$BRANCHES_FILE"

TOTAL=$(grep -v "^#" "$BRANCHES_FILE" | grep -v "^$" | wc -l)
log_info "Encontradas $TOTAL branches de fixes"

if [ "$TOTAL" -eq 0 ]; then
    log_warn "Nenhuma branch de fix encontrada"
    exit 0
fi

# Mostrar lista
echo ""
echo "Branches a processar:"
grep -v "^#" "$BRANCHES_FILE" | grep -v "^$" | nl
echo ""

# Criar branch de trabalho
WORK_BRANCH="work/agent-fixes-$(date +%s)"
BASE_BRANCH="origin/develop"

log_info "Criando branch de trabalho: $WORK_BRANCH"
git checkout -b "$WORK_BRANCH" "$BASE_BRANCH"

# Processar em lotes pequenos (5 branches por vez)
BATCH_SIZE=5
SUCCESS=0
FAILED=0
CURRENT=0

while IFS= read -r branch; do
    [[ "$branch" =~ ^# ]] && continue
    [ -z "$branch" ] && continue
    
    CURRENT=$((CURRENT + 1))
    echo ""
    echo "----------------------------------------"
    log_info "[$CURRENT/$TOTAL] Processando: $branch"
    echo "----------------------------------------"
    
    # Tentar merge
    if git merge "origin/$branch" --no-ff -m "merge(fixes): integrate $branch" 2>> /tmp/agent-fixes-$$.log; then
        log_success "✓ Merge bem-sucedido"
        
        # Validação rápida para fixes
        if ./scripts/validate-merge.sh 2>> /tmp/agent-fixes-$$.log; then
            log_success "✓ Validação passou"
            SUCCESS=$((SUCCESS + 1))
        else
            log_error "✗ Validação falhou"
            log_warn "Revertendo merge..."
            git reset --hard HEAD~1
            FAILED=$((FAILED + 1))
        fi
    else
        log_error "✗ Merge falhou"
        git merge --abort 2>/dev/null || true
        FAILED=$((FAILED + 1))
    fi
    
    # A cada 5 branches, fazer checkpoint
    if [ $((CURRENT % BATCH_SIZE)) -eq 0 ]; then
        log_info "Checkpoint: $CURRENT branches processadas"
        log_info "Sucessos: $SUCCESS | Falhas: $FAILED"
    fi
done < "$BRANCHES_FILE"

# Resumo
echo ""
echo "=========================================="
log_success "RESUMO - $AGENT_NAME"
echo "=========================================="
echo "Processadas: $TOTAL"
echo -e "${GREEN}Sucessos: $SUCCESS${NC}"
echo -e "${RED}Falhas: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    log_success "🎉 TODOS OS FIXES INTEGRADOS!"
    echo "Branch de trabalho: $WORK_BRANCH"
else
    log_warn "⚠️  Alguns fixes falharam"
    echo "Branch de trabalho: $WORK_BRANCH (parcial)"
fi

# Limpar
rm -f "$BRANCHES_FILE" /tmp/agent-fixes-$$.log
