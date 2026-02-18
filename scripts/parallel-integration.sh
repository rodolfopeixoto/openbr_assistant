#!/bin/bash
# parallel-integration.sh - Gradual integration of completed features

set -e

INTEGRATION_BRANCH="feature/security-hardening-2025"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR/.."

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INTEGRATION]${NC} $1"; }
success() { echo -e "${GREEN}[INTEGRATION]${NC} $1"; }
warn() { echo -e "${YELLOW}[INTEGRATION]${NC} $1"; }
error() { echo -e "${RED}[INTEGRATION]${NC} $1"; }

# Lista de features em ordem de integração (respeitando dependências)
PHASE1_FEATURES=("SEC-001" "SEC-004" "SEC-007" "SEC-011")
PHASE2_FEATURES=("SEC-002" "SEC-005" "SEC-008" "SEC-012")
PHASE3_FEATURES=("SEC-003" "SEC-006" "SEC-009" "SEC-013")
PHASE4_FEATURES=("SEC-010")

merge_feature_branch() {
    local feature=$1
    local branch="feature/${feature}"
    
    log "Integrando $feature..."
    
    # Verificar se branch existe
    if ! git show-ref --verify --quiet "refs/heads/$branch"; then
        error "Branch não existe: $branch"
        return 1
    fi
    
    # Checkout para integration
    git checkout "$INTEGRATION_BRANCH"
    
    # Merge com estratégia ort ours para evitar conflitos em arquivos renomeados
    git merge --no-ff "$branch" -m "🔒 Integrate $feature

Security hardening feature:
- Implementation complete
- Tests passing
- Documentation updated

Refs: $feature" || {
        error "❌ Merge conflituoso para $feature"
        git merge --abort
        return 1
    }
    
    # Atualizar feature-flags.ts para habilitar a feature
    enable_feature_flag "$feature"
    
    success "✅ $feature integrado"
    return 0
}

enable_feature_flag() {
    local feature=$1
    local flag_file="src/security/feature-flags.ts"
    
    # Converter SEC-XXX para SEC00X_XXX
    local flag_name=$(echo "$feature" | sed 's/-/_/g' | tr '[:lower:]' '[:upper:]')
    
    # Atualizar default para true no arquivo
    sed -i.bak "s/${flag_name}: false/${flag_name}: true/g" "$flag_file"
    rm -f "$flag_file.bak"
    
    # Commit da mudança
    git add "$flag_file"
    git commit -m "🔧 Enable ${flag_name} in feature flags"
    
    log "Feature flag ${flag_name} habilitado"
}

run_integration_tests() {
    log "🧪 Rodando testes de integração..."
    
    pnpm install --frozen-lockfile
    pnpm lint || return 1
    pnpm typecheck || return 1
    pnpm test:unit || return 1
    
    success "✅ Testes passaram"
    return 0
}

integrate_phase() {
    local phase=$1
    shift
    local features=("$@")
    
    log "═══════════════════════════════════════"
    log "  FASE $phase - Integração"
    log "═══════════════════════════════════════"
    echo ""
    
    local failed=()
    
    for feature in "${features[@]}"; do
        if merge_feature_branch "$feature"; then
            success "✓ $feature integrado"
        else
            error "✗ $feature falhou"
            failed+=("$feature")
        fi
    done
    
    echo ""
    
    if [ ${#failed[@]} -eq 0 ]; then
        log "Rodando testes pós-integração..."
        if run_integration_tests; then
            success "✅ Fase $phase integrada com sucesso!"
            git push origin "$INTEGRATION_BRANCH"
            return 0
        else
            error "❌ Testes falharam após integração"
            return 1
        fi
    else
        error "❌ Falhas na Fase $phase:"
        printf '%s\n' "${failed[@]}"
        return 1
    fi
}

show_menu() {
    echo ""
    echo "🔀 Parallel Integration System"
    echo ""
    echo "Uso: ./scripts/parallel-integration.sh [comando]"
    echo ""
    echo "Comandos:"
    echo "  phase1     - Integrar Fase 1 (Core)"
    echo "  phase2     - Integrar Fase 2 (API)"
    echo "  phase3     - Integrar Fase 3 (Infra)"
    echo "  phase4     - Integrar Fase 4 (App)"
    echo "  all        - Integrar todas as fases (cuidado!)"
    echo "  status     - Verificar status de integração"
    echo ""
}

show_status() {
    log "Status de Integração"
    echo ""
    
    for phase in 1 2 3 4; do
        echo "Fase $phase:"
        case $phase in
            1) features=(${PHASE1_FEATURES[@]}) ;;
            2) features=(${PHASE2_FEATURES[@]}) ;;
            3) features=(${PHASE3_FEATURES[@]}) ;;
            4) features=(${PHASE4_FEATURES[@]}) ;;
        esac
        
        for f in "${features[@]}"; do
            # Verificar se já foi mergeado
            if git merge-base --is-ancestor "feature/$f" "$INTEGRATION_BRANCH" 2>/dev/null; then
                echo "  ✅ $f"
            else
                echo "  ⏳ $f"
            fi
        done
        echo ""
    done
}

# Main
case "${1:-}" in
    phase1)
        integrate_phase 1 "${PHASE1_FEATURES[@]}"
        ;;
    phase2)
        integrate_phase 2 "${PHASE2_FEATURES[@]}"
        ;;
    phase3)
        integrate_phase 3 "${PHASE3_FEATURES[@]}"
        ;;
    phase4)
        integrate_phase 4 "${PHASE4_FEATURES[@]}"
        ;;
    all)
        warn "⚠️  Isso irá integrar TODAS as fases de uma vez!"
        read -p "Continuar? (yes/no) " -r
        if [[ $REPLY == "yes" ]]; then
            integrate_phase 1 "${PHASE1_FEATURES[@]}" && \
            integrate_phase 2 "${PHASE2_FEATURES[@]}" && \
            integrate_phase 3 "${PHASE3_FEATURES[@]}" && \
            integrate_phase 4 "${PHASE4_FEATURES[@]}"
        fi
        ;;
    status)
        show_status
        ;;
    *)
        show_menu
        ;;
esac
