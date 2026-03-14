#!/bin/bash
# integrate-next.sh - Script para integrar branches pendentes de forma organizada

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}$1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

show_help() {
    cat << EOF
Uso: ./scripts/integrate-next.sh [OPÇÃO] [BRANCH]

Opções:
  list              - Lista branches pendentes
  next              - Integra a próxima branch da lista
  integrate <nome>  - Integra uma branch específica
  priority          - Lista por prioridade
  status            - Mostra status atual
  help              - Mostra esta ajuda

Exemplos:
  ./scripts/integrate-next.sh list
  ./scripts/integrate-next.sh integrate feat/antigravity-integration
  ./scripts/integrate-next.sh next
EOF
}

list_pending() {
    log "📋 Branches pendentes:"
    echo ""
    
    if [ -f .pending-branches-complete.txt ]; then
        echo "🔴 Prioridade 1 (Features Críticas):"
        grep -E "feat/(antigravity|chat-ux|llm-task|lobster|mattermost|models|telegram)" .pending-branches-complete.txt 2>/dev/null | head -8 | nl
        
        echo ""
        echo "🟡 Prioridade 2 (Fixes Importantes):"
        grep -E "fix/(audio|gemini|discord|chrome|telegram)" .pending-branches-complete.txt 2>/dev/null | head -8 | nl
        
        echo ""
        echo "⚪ Total: $(wc -l < .pending-branches-complete.txt) branches"
    else
        error "Arquivo .pending-branches-complete.txt não encontrado"
        error "Execute: ./scripts/list-pending-branches.sh"
    fi
}

integrate_branch() {
    local branch=$1
    
    if [ -z "$branch" ]; then
        error "Nome da branch não especificado"
        exit 1
    fi
    
    log "🔧 Integrando: $branch"
    echo ""
    
    # Verificar se estamos na develop
    if [ "$(git branch --show-current)" != "develop" ]; then
        warn "Mudando para develop..."
        git checkout develop
    fi
    
    # Atualizar develop
    log "Atualizando develop..."
    git pull origin develop
    
    # Criar backup
    log "Criando backup..."
    git branch backup-develop-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
    
    # Tentar merge
    log "Tentando merge..."
    if git merge origin/$branch --no-ff -m "merge: integrate $branch"; then
        success "Merge bem-sucedido!"
        
        # Validar
        log "Validando build..."
        if pnpm build >/tmp/integration-build.log 2>&1; then
            success "Build passou!"
            
            # Perguntar se quer fazer push
            read -p "Fazer push para origin? (s/n): " push
            if [ "$push" = "s" ]; then
                git push origin develop
                success "Push concluído!"
            fi
            
            # Remover da lista
            if [ -f .pending-branches-complete.txt ]; then
                sed -i.bak "/^${branch}$/d" .pending-branches-complete.txt
                rm -f .pending-branches-complete.txt.bak
                success "Removida da lista de pendentes"
            fi
            
            # Registrar progresso
            echo "$(date): ✅ $branch" >> INTEGRATION_LOG.md
            
        else
            warn "Build falhou! Verifique: /tmp/integration-build.log"
            echo "$(date): ⚠️  $branch (build falhou)" >> INTEGRATION_LOG.md
        fi
        
    else
        error "Merge falhou - conflitos detectados"
        echo ""
        warn "Arquivos em conflito:"
        git diff --name-only --diff-filter=U | sed 's/^/  - /'
        echo ""
        warn "Resolva manualmente:"
        echo "  1. Edite os arquivos listados"
        echo "  2. Remova os marcadores <<<<<<< ======= >>>>>>>"
        echo "  3. git add ."
        echo "  4. git commit -m \"merge: integrate $branch\""
        echo "  5. ./scripts/conflict-checker.sh ./src"
        echo "  6. pnpm build"
        echo ""
        echo "Ou aborte: git merge --abort"
        echo ""
        echo "$(date): ❌ $branch (conflitos)" >> INTEGRATION_LOG.md
    fi
}

show_status() {
    log "📊 Status da Integração"
    echo ""
    
    if [ -f INTEGRATION_LOG.md ]; then
        echo "✅ Integradas com sucesso:"
        grep "✅" INTEGRATION_LOG.md | tail -5
        echo ""
        echo "⚠️  Com problemas:"
        grep "⚠️" INTEGRATION_LOG.md | tail -3
        echo ""
        echo "❌ Falhas:"
        grep "❌" INTEGRATION_LOG.md | tail -3
        echo ""
    fi
    
    if [ -f .pending-branches-complete.txt ]; then
        echo "⏳ Ainda pendentes: $(wc -l < .pending-branches-complete.txt) branches"
    fi
}

# Main
case "${1:-help}" in
    list)
        list_pending
        ;;
    integrate)
        integrate_branch "$2"
        ;;
    next)
        if [ -f .pending-branches-complete.txt ]; then
            NEXT=$(head -1 .pending-branches-complete.txt)
            if [ -n "$NEXT" ]; then
                integrate_branch "$NEXT"
            else
                success "Todas as branches foram integradas!"
            fi
        else
            error "Lista de pendentes não encontrada"
        fi
        ;;
    priority)
        list_pending
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Comando desconhecido: $1"
        show_help
        exit 1
        ;;
esac
