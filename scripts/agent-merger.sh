#!/bin/bash
# agent-merger.sh - Agente de merge individual

AGENT_ID=$1
shift

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[Agent-$AGENT_ID]${NC} $1"; }
success() { echo -e "${GREEN}[Agent-$AGENT_ID]${NC} $1"; }
warn() { echo -e "${YELLOW}[Agent-$AGENT_ID]${NC} $1"; }
error() { echo -e "${RED}[Agent-$AGENT_ID]${NC} $1"; }

for branch in "$@"; do
    log "Processando: $branch"
    
    if git merge "origin/$branch" --no-ff -m "merge: integrate $branch" 2>/tmp/agent-$AGENT_ID-$$.log; then
        success "✅ $branch integrada"
        echo "SUCCESS:$branch" >> .merge-results.txt
    else
        # Tentar resolver conflitos comuns
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml 2>/dev/null || true
        
        # Verificar se resolveu
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            git commit -m "merge: integrate $branch (auto-resolved)" 2>> /tmp/agent-$AGENT_ID-$$.log
            success "✅ $branch auto-resolvida"
            echo "SUCCESS:$branch" >> .merge-results.txt
        else
            error "❌ $branch falhou ($CONFLICTS conflitos)"
            echo "FAILED:$branch:$CONFLICTS" >> .merge-results.txt
            echo "$branch" >> .merge-failed.txt
            git merge --abort 2>/dev/null || true
        fi
    fi
done

rm -f /tmp/agent-$AGENT_ID-$$.log
