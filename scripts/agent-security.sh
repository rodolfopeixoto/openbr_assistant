#!/bin/bash
# agent-security.sh - Agente Dev: Especialista em Segurança

set -e

AGENT_NAME="Agent-Security"
PRIORITY="CRÍTICO"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[$AGENT_NAME]${NC} $1"; }
log_success() { echo -e "${GREEN}[$AGENT_NAME]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[$AGENT_NAME]${NC} $1"; }
log_error() { echo -e "${RED}[$AGENT_NAME]${NC} $1"; }

echo "=========================================="
echo "🔒 $AGENT_NAME - MERGE DE SEGURANÇA"
echo "   Prioridade: $PRIORITY"
echo "=========================================="

# Buscar branches de segurança automaticamente
log_info "Buscando branches de segurança..."

# Lista de padrões de segurança
SECURITY_PATTERNS=(
    "sandbox"
    "traversal"
    "lfi"
    "security"
    "auth"
    "bypass"
    "injection"
    "xss"
    "csrf"
    "exposure"
)

# Criar arquivo de branches
BRANCHES_FILE=".agent-security-branches.txt"
echo "# Branches de segurança - gerado automaticamente" > "$BRANCHES_FILE"

for pattern in "${SECURITY_PATTERNS[@]}"; do
    git branch -r | grep "origin/fix/" | grep "$pattern" | sed 's/origin\///' >> "$BRANCHES_FILE" 2>/dev/null || true
    git branch -r | grep "origin/security/" | sed 's/origin\///' >> "$BRANCHES_FILE" 2>/dev/null || true
done

# Remover duplicados
sort -u "$BRANCHES_FILE" -o "$BRANCHES_FILE"

TOTAL=$(grep -v "^#" "$BRANCHES_FILE" | grep -v "^$" | wc -l)
log_info "Encontradas $TOTAL branches de segurança"

if [ "$TOTAL" -eq 0 ]; then
    log_warn "Nenhuma branch de segurança encontrada"
    exit 0
fi

# Mostrar lista
echo ""
echo "Branches a processar:"
grep -v "^#" "$BRANCHES_FILE" | grep -v "^$" | nl
echo ""

# Criar branch de trabalho
WORK_BRANCH="work/agent-security-$(date +%s)"
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
    
    # Tentar merge
    if git merge "origin/$branch" --no-ff -m "merge(security): integrate $branch" 2>> /tmp/agent-security-$$.log; then
        log_success "✓ Merge bem-sucedido"
        
        # Validar com foco em segurança
        log_info "Validando alterações de segurança..."
        
        if ./scripts/validate-merge.sh 2>> /tmp/agent-security-$$.log; then
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
    log_success "🎉 TODAS AS BRANCHES DE SEGURANÇA INTEGRADAS!"
    echo "Branch de trabalho: $WORK_BRANCH"
    echo ""
    echo "Próximo passo: Notificar coordenador para integrar na mainline"
else
    log_warn "⚠️  Algumas branches falharam"
    echo "Branch de trabalho: $WORK_BRANCH (parcial)"
    echo "Verificar branches que falharam"
fi

# Limpar
rm -f "$BRANCHES_FILE" /tmp/agent-security-$$.log
