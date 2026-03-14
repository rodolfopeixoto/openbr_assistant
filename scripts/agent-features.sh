#!/bin/bash
# agent-features.sh - Agente Dev: Especialista em Features

set -e

AGENT_NAME="Agent-Features"
PRIORITY="ALTO"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${MAGENTA}[$AGENT_NAME]${NC} $1"; }
log_success() { echo -e "${GREEN}[$AGENT_NAME]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[$AGENT_NAME]${NC} $1"; }
log_error() { echo -e "${RED}[$AGENT_NAME]${NC} $1"; }

echo "=========================================="
echo "✨ $AGENT_NAME - MERGE DE FEATURES"
echo "   Prioridade: $PRIORITY"
echo "=========================================="

# Buscar branches de features automaticamente
log_info "Buscando branches de features..."

# Criar arquivo de branches
BRANCHES_FILE=".agent-features-branches.txt"
echo "# Branches de features - gerado automaticamente" > "$BRANCHES_FILE"

# Separar em core (menor risco) e advanced (maior risco)
git branch -r | grep "origin/feat/" | grep -E "(chat|ux|config|ui|ux|improvement)" | sed 's/origin\///' >> "$BRANCHES_FILE" 2>/dev/null || true

# Remover duplicados e ordenar por tamanho (menores primeiro)
sort -u "$BRANCHES_FILE" -o "$BRANCHES_FILE"

TOTAL=$(grep -v "^#" "$BRANCHES_FILE" | grep -v "^$" | wc -l)
log_info "Encontradas $TOTAL branches de features core"

if [ "$TOTAL" -eq 0 ]; then
    log_warn "Nenhuma branch de feature encontrada"
    exit 0
fi

# Mostrar lista
echo ""
echo "Branches a processar:"
grep -v "^#" "$BRANCHES_FILE" | grep -v "^$" | nl
echo ""

# Criar branch de trabalho
WORK_BRANCH="work/agent-features-$(date +%s)"
BASE_BRANCH="origin/develop"

log_info "Criando branch de trabalho: $WORK_BRANCH"
git checkout -b "$WORK_BRANCH" "$BASE_BRANCH"

# Processar cada branch
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
    
    # Verificar tamanho do diff
    DIFF_STAT=$(git diff --stat "$BASE_BRANCH" "origin/$branch" 2>/dev/null | tail -1 || echo "0")
    log_info "Tamanho da mudança: $DIFF_STAT"
    
    # Tentar merge
    if git merge "origin/$branch" --no-ff -m "merge(features): integrate $branch" 2>> /tmp/agent-features-$$.log; then
        log_success "✓ Merge bem-sucedido"
        
        # Validar
        log_info "Validando features..."
        
        if ./scripts/validate-merge.sh 2>> /tmp/agent-features-$$.log; then
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
    log_success "🎉 TODAS AS FEATURES CORE INTEGRADAS!"
    echo "Branch de trabalho: $WORK_BRANCH"
else
    log_warn "⚠️  Algumas features falharam"
    echo "Branch de trabalho: $WORK_BRANCH (parcial)"
fi

# Limpar
rm -f "$BRANCHES_FILE" /tmp/agent-features-$$.log
