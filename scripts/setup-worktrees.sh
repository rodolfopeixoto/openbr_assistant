#!/bin/bash
# setup-worktrees.sh - Setup git worktrees for parallel development

set -e

echo "🌳 Setting up Git Worktrees for Security Team..."

# Voltar para a branch principal
git checkout feature/security-hardening-2025

# Diretório base para worktrees
WORKTREE_BASE="../openbr-worktrees"
mkdir -p "$WORKTREE_BASE"

# Limpar worktrees antigos se existirem
for branch in $(git branch -r | grep "feature/SEC-" | sed 's/origin\///'); do
    wt_name=$(echo "$branch" | sed 's/feature\///')
    if [ -d "$WORKTREE_BASE/$wt_name" ]; then
        echo "Removing old worktree: $wt_name"
        git worktree remove "$WORKTREE_BASE/$wt_name" --force 2>/dev/null || true
        rm -rf "$WORKTREE_BASE/$wt_name"
    fi
done

# Criar worktrees para cada feature
FEATURES=(
    "SEC-001-remove-default-secret"
    "SEC-002-argon2id-migration"
    "SEC-003-keyring-impl"
    "SEC-004-cors-impl"
    "SEC-005-csrf-protection"
    "SEC-006-ws-security"
    "SEC-007-rate-limiting"
    "SEC-008-security-headers"
    "SEC-009-audio-validation"
    "SEC-010-ui-access"
    "SEC-011-llm-security"
    "SEC-012-audit-logging"
    "SEC-013-api-security"
)

for feature in "${FEATURES[@]}"; do
    wt_path="$WORKTREE_BASE/$feature"
    echo "Creating worktree: $feature"
    git worktree add "$wt_path" "feature/$feature"
    
    # Criar arquivo de status
    echo "IN_PROGRESS" > "$wt_path/.agent-status"
    echo "" > "$wt_path/.agent-assignee"
done

echo ""
echo "✅ Worktrees criados em: $WORKTREE_BASE"
echo ""
echo "📁 Estrutura:"
ls -la "$WORKTREE_BASE"
echo ""
echo "Para entrar em um worktree:"
echo "  cd $WORKTREE_BASE/SEC-001-remove-default-secret"
echo ""
echo "Para ver status de todos:"
echo "  ./scripts/check-all-status.sh"
