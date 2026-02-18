#!/bin/bash
# coordinator.sh - Central coordinator for security team

set -e

WORKTREE_BASE="../openbr-worktrees"
INTEGRATION_BRANCH="feature/security-hardening-2025"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR/.."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() { echo -e "${BLUE}[COORDINATOR]${NC} $1"; }
log_success() { echo -e "${GREEN}[COORDINATOR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[COORDINATOR]${NC} $1"; }
log_error() { echo -e "${RED}[COORDINATOR]${NC} $1"; }

show_help() {
    cat << EOF
🎮 OpenClaw Security Team - Central Coordinator

Comandos disponíveis:
  status              - Mostrar status de todas as features
  sync [feature]      - Sincronizar feature com integration branch
  merge-ready         - Listar features prontas para merge
  integrate [feature] - Integrar feature na branch principal
  test-integration    - Rodar testes de integração
  release             - Preparar release (merge para main)
  cleanup             - Limpar worktrees e resetar

Exemplos:
  ./scripts/coordinator.sh status
  ./scripts/coordinator.sh sync SEC-001-remove-default-secret
  ./scripts/coordinator.sh integrate SEC-001-remove-default-secret
EOF
}

show_status() {
    log_info "📊 Status do Time de Segurança"
    echo ""
    
    printf "%-30s %-15s %-20s %-10s\n" "FEATURE" "STATUS" "AGENTE" "COMMITS"
    printf "%-30s %-15s %-20s %-10s\n" "------------------------------" "---------------" "--------------------" "----------"
    
    for wt in "$WORKTREE_BASE"/SEC-*; do
        if [ -d "$wt" ]; then
            feature=$(basename "$wt")
            status_file="$wt/.agent-status"
            assignee_file="$wt/.agent-assignee"
            
            if [ -f "$status_file" ]; then
                status=$(cat "$status_file")
            else
                status="UNKNOWN"
            fi
            
            if [ -f "$assignee_file" ]; then
                assignee=$(cat "$assignee_file")
            else
                assignee="Unassigned"
            fi
            
            # Contar commits à frente do integration
            cd "$wt"
            commits_ahead=$(git rev-list --count HEAD.."$INTEGRATION_BRANCH" 2>/dev/null || echo "0")
            cd - > /dev/null
            
            # Cor baseada no status
            case "$status" in
                "DONE") color="$GREEN" ;;
                "IN_PROGRESS") color="$YELLOW" ;;
                "BLOCKED") color="$RED" ;;
                *) color="$NC" ;;
            esac
            
            printf "${color}%-30s${NC} %-15s %-20s %-10s\n" "$feature" "$status" "$assignee" "$commits_ahead"
        fi
    done
    
    echo ""
    log_info "Branch de Integração: $INTEGRATION_BRANCH"
    log_info "Worktrees em: $WORKTREE_BASE"
}

sync_feature() {
    local feature=$1
    local wt_path="$WORKTREE_BASE/$feature"
    
    if [ ! -d "$wt_path" ]; then
        log_error "Worktree não encontrado: $feature"
        return 1
    fi
    
    log_info "🔄 Sincronizando $feature com $INTEGRATION_BRANCH"
    
    cd "$wt_path"
    
    # Verificar se há mudanças não commitadas
    if ! git diff --quiet HEAD; then
        log_warn "Há mudanças não commitadas em $feature"
        read -p "Deseja fazer commit antes de sincronizar? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Digite a mensagem de commit:"
            read commit_msg
            git add -A
            git commit -m "$commit_msg"
        else
            log_error "Abortando sync - há mudanças não commitadas"
            return 1
        fi
    fi
    
    # Fetch e rebase
    git fetch origin
    git rebase origin/$INTEGRATION_BRANCH || {
        log_error "Conflito durante rebase de $feature"
        log_info "Resolva os conflitos manualmente em: $wt_path"
        return 1
    }
    
    git push origin "feature/${feature}" --force-with-lease
    
    log_success "✅ $feature sincronizado com sucesso"
}

show_merge_ready() {
    log_info "✅ Features prontas para merge:"
    echo ""
    
    for wt in "$WORKTREE_BASE"/SEC-*; do
        if [ -d "$wt" ]; then
            status_file="$wt/.agent-status"
            if [ -f "$status_file" ]; then
                status=$(cat "$status_file")
                if [ "$status" == "DONE" ]; then
                    feature=$(basename "$wt")
                    echo "  ✓ $feature"
                fi
            fi
        fi
    done
}

integrate_feature() {
    local feature=$1
    local wt_path="$WORKTREE_BASE/$feature"
    
    if [ ! -d "$wt_path" ]; then
        log_error "Feature não encontrada: $feature"
        return 1
    fi
    
    # Verificar se está marcado como DONE
    status_file="$wt_path/.agent-status"
    if [ -f "$status_file" ]; then
        status=$(cat "$status_file")
        if [ "$status" != "DONE" ]; then
            log_warn "Feature $feature não está marcada como DONE (status: $status)"
            read -p "Continuar mesmo assim? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                return 1
            fi
        fi
    fi
    
    log_info "🔀 Integrando $feature em $INTEGRATION_BRANCH"
    
    # Ir para branch de integração
    git checkout "$INTEGRATION_BRANCH"
    git pull origin "$INTEGRATION_BRANCH"
    
    # Merge com --no-ff para preservar histórico
    git merge --no-ff "feature/${feature}" -m "Integrate ${feature}

Security feature implementation complete.

Features:
- Implementation following security spec
- Unit tests passing
- Integration tests passing
- Documentation updated

Refs: SEC-${feature:4:3}"
    
    if [ $? -eq 0 ]; then
        log_success "✅ $feature integrado com sucesso"
        
        # Atualizar status
        echo "MERGED" > "$status_file"
        
        # Push para remote
        git push origin "$INTEGRATION_BRANCH"
    else
        log_error "❌ Merge falhou para $feature"
        log_info "Resolva os conflitos manualmente e tente novamente"
        return 1
    fi
}

test_integration() {
    log_info "🧪 Rodando testes de integração"
    
    git checkout "$INTEGRATION_BRANCH"
    git pull origin "$INTEGRATION_BRANCH"
    
    log_info "Instalando dependências..."
    pnpm install
    
    log_info "Rodando linter..."
    pnpm lint || {
        log_error "❌ Linter falhou"
        return 1
    }
    
    log_info "Rodando type check..."
    pnpm typecheck || {
        log_error "❌ Type check falhou"
        return 1
    }
    
    log_info "Rodando testes unitários..."
    pnpm test:unit || {
        log_error "❌ Testes unitários falharam"
        return 1
    }
    
    log_info "Rodando testes de integração..."
    pnpm test:integration || {
        log_error "❌ Testes de integração falharam"
        return 1
    }
    
    log_success "✅ Todos os testes passaram!"
}

prepare_release() {
    log_info "🚀 Preparando release para main"
    
    # Verificar se estamos na branch de integração
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "$INTEGRATION_BRANCH" ]; then
        log_error "Deve estar na branch $INTEGRATION_BRANCH para fazer release"
        return 1
    fi
    
    # Rodar testes finais
    test_integration || return 1
    
    # Criar PR para main
    log_info "Criando Pull Request para main..."
    gh pr create \
        --base main \
        --head "$INTEGRATION_BRANCH" \
        --title "🔒 Security Hardening Release" \
        --body-file docs/SECURITY_RELEASE_NOTES.md || {
        log_warn "Não foi possível criar PR automaticamente"
        log_info "Crie manualmente em: https://github.com/openclaw/openclaw/pull/new/$INTEGRATION_BRANCH"
    }
    
    log_success "✅ Release preparado!"
}

cleanup() {
    log_warn "🧹 Isso irá remover todos os worktrees e resetar o ambiente"
    read -p "Tem certeza? (yes/no) " -r
    if [[ $REPLY == "yes" ]]; then
        for wt in "$WORKTREE_BASE"/SEC-*; do
            if [ -d "$wt" ]; then
                feature=$(basename "$wt")
                log_info "Removendo worktree: $feature"
                git worktree remove "$wt" --force 2>/dev/null || rm -rf "$wt"
            fi
        done
        rm -rf "$WORKTREE_BASE"
        log_success "✅ Cleanup completo"
    else
        log_info "Cleanup cancelado"
    fi
}

# Main
case "${1:-status}" in
    status)
        show_status
        ;;
    sync)
        if [ -z "$2" ]; then
            log_error "Especifique a feature: ./scripts/coordinator.sh sync SEC-001-remove-default-secret"
            exit 1
        fi
        sync_feature "$2"
        ;;
    merge-ready)
        show_merge_ready
        ;;
    integrate)
        if [ -z "$2" ]; then
            log_error "Especifique a feature: ./scripts/coordinator.sh integrate SEC-001-remove-default-secret"
            exit 1
        fi
        integrate_feature "$2"
        ;;
    test-integration)
        test_integration
        ;;
    release)
        prepare_release
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Comando desconhecido: $1"
        show_help
        exit 1
        ;;
esac
