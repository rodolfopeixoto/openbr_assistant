#!/bin/bash
# parallel-merge-system.sh - Sistema de merge paralelo com agentes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Configurações
PARALLEL_JOBS=4
BATCH_SIZE=3
WORK_DIR=".parallel-work"
LOGS_DIR="$WORK_DIR/logs"
QUEUE_FILE="$WORK_DIR/queue.txt"
LOCK_FILE="$WORK_DIR/lock"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
success() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} $1"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)]${NC} $1"; }

# Inicializar estrutura
init_system() {
    log "🚀 Inicializando Sistema de Merge Paralelo"
    mkdir -p "$WORK_DIR" "$LOGS_DIR"
    
    # Gerar fila de branches
    if [ ! -f "$QUEUE_FILE" ]; then
        log "📋 Gerando fila de branches..."
        git branch -r | grep -E "origin/(feat|fix)/" | \
            grep -v -E "(security|sandbox|traversal|lfi)" | \
            sed 's/^[[:space:]]*origin\///' > "$QUEUE_FILE"
        TOTAL=$(wc -l < "$QUEUE_FILE")
        log "✅ $TOTAL branches na fila"
    fi
}

# Agente Merge
agent_merge() {
    local agent_id=$1
    local work_branch="$WORK_DIR/agent-$agent_id"
    local log_file="$LOGS_DIR/agent-$agent_id.log"
    
    # Criar worktree
    git worktree add "$work_branch" develop 2>/dev/null || true
    cd "$work_branch"
    
    while true; do
        # Pegar próxima branch da fila (com lock)
        (
            flock -n 200 || exit 1
            BRANCH=$(head -1 "$QUEUE_FILE")
            [ -z "$BRANCH" ] && exit 0
            sed -i '' '1d' "$QUEUE_FILE" 2>/dev/null || sed -i '1d' "$QUEUE_FILE"
            echo "$BRANCH"
        ) 200>"$LOCK_FILE"
        
        BRANCH=$?
        [ -z "$BRANCH" ] && break
        
        log "Agent-$agent_id: Processando $BRANCH"
        
        # Tentar merge
        if git merge "origin/$BRANCH" --no-ff -m "merge: integrate $BRANCH" >> "$log_file" 2>&1; then
            success "Agent-$agent_id: ✅ $BRANCH integrada"
            echo "$BRANCH:success" >> "$WORK_DIR/results.txt"
        else
            # Tentar auto-resolver
            git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
            git add CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
            
            # Verificar conflitos restantes
            CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
            
            if [ "$CONFLICTS" -eq 0 ]; then
                git commit -m "merge: integrate $BRANCH (auto-resolved)" >> "$log_file" 2>&1
                success "Agent-$agent_id: ✅ $BRANCH auto-resolvida"
                echo "$BRANCH:success" >> "$WORK_DIR/results.txt"
            else
                error "Agent-$agent_id: ❌ $BRANCH falhou ($CONFLICTS conflitos)"
                echo "$BRANCH:failed:$CONFLICTS" >> "$WORK_DIR/results.txt"
                git merge --abort 2>/dev/null || true
            fi
        fi
    done
    
    cd "$SCRIPT_DIR/.."
}

# Agente Revisor
agent_reviewer() {
    local agent_id=$1
    local interval=5
    
    log "👁️  Revisor-$agent_id iniciado"
    
    while [ -f "$WORK_DIR/running" ]; do
        sleep $interval
        
        # Verificar conflitos em arquivos processados
        if [ -f "$WORK_DIR/results.txt" ]; then
            local failed=$(grep ":failed:" "$WORK_DIR/results.txt" | tail -5)
            
            if [ -n "$failed" ]; then
                warn "Revisor: Encontradas falhas recentes:"
                echo "$failed" | while read line; do
                    local branch=$(echo "$line" | cut -d: -f1)
                    local conflicts=$(echo "$line" | cut -d: -f3)
                    warn "  - $branch ($conflicts conflitos)"
                done
            fi
        fi
        
        # Verificar progresso
        if [ -f "$QUEUE_FILE" ]; then
            local remaining=$(wc -l < "$QUEUE_FILE")
            local total=$(cat "$WORK_DIR/results.txt" 2>/dev/null | wc -l)
            local success=$(grep ":success" "$WORK_DIR/results.txt" 2>/dev/null | wc -l)
            
            if [ $((total % 10)) -eq 0 ] && [ $total -gt 0 ]; then
                log "📊 Progresso: $success/$total sucessos, $remaining restantes"
            fi
        fi
    done
}

# Consolidar resultados
consolidate() {
    log "📦 Consolidando resultados..."
    
    local work_branches=$(find "$WORK_DIR" -name "agent-*" -type d 2>/dev/null)
    local success_count=$(grep ":success" "$WORK_DIR/results.txt" 2>/dev/null | wc -l)
    local failed_count=$(grep ":failed:" "$WORK_DIR/results.txt" 2>/dev/null | wc -l)
    
    log "📊 Resultados:"
    log "  Sucessos: $success_count"
    log "  Falhas: $failed_count"
    
    # Criar branch de consolidação
    local consolidate_branch="consolidation/$(date +%Y%m%d-%H%M%S)"
    git checkout -b "$consolidate_branch" develop
    
    # Merge de cada branch de trabalho que teve sucesso
    for wb in $work_branches; do
        if [ -d "$wb/.git" ]; then
            local branch_name=$(basename "$wb")
            log "Integrando $branch_name..."
            
            # Criar patch e aplicar
            cd "$wb"
            git diff develop > "$WORK_DIR/$branch_name.patch" 2>/dev/null || true
            cd "$SCRIPT_DIR/.."
            
            if [ -s "$WORK_DIR/$branch_name.patch" ]; then
                git apply "$WORK_DIR/$branch_name.patch" 2>/dev/null || warn "Falha ao aplicar $branch_name"
            fi
        fi
    done
    
    # Commit das alterações
    git add -A
    git commit -m "consolidation: integrate batch of branches

- Sucessos: $success_count
- Falhas: $failed_count
- Data: $(date)"
    
    success "✅ Consolidação concluída em $consolidate_branch"
}

# Main
case "${1:-run}" in
    init)
        init_system
        ;;
    agent)
        agent_merge "${2:-1}"
        ;;
    reviewer)
        agent_reviewer "${2:-1}"
        ;;
    consolidate)
        consolidate
        ;;
    run)
        init_system
        touch "$WORK_DIR/running"
        
        log "🚀 Iniciando $PARALLEL_JOBS agentes em paralelo..."
        
        # Iniciar agentes
        for i in $(seq 1 $PARALLEL_JOBS); do
            agent_merge $i &
        done
        
        # Iniciar revisor
        agent_reviewer 1 &
        
        # Aguardar
        wait
        
        rm -f "$WORK_DIR/running"
        consolidate
        ;;
    status)
        if [ -f "$WORK_DIR/results.txt" ]; then
            echo "📊 Status Atual:"
            echo "  Processadas: $(cat "$WORK_DIR/results.txt" | wc -l)"
            echo "  Sucessos: $(grep ":success" "$WORK_DIR/results.txt" | wc -l)"
            echo "  Falhas: $(grep ":failed:" "$WORK_DIR/results.txt" | wc -l)"
            echo "  Restantes: $(wc -l < "$QUEUE_FILE")"
        else
            echo "⏳ Sistema não iniciado"
        fi
        ;;
    *)
        echo "Uso: $0 {init|run|agent <n>|reviewer|consolidate|status}"
        exit 1
        ;;
esac
