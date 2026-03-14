#!/bin/bash
# batch-merge-all.sh - Merge em massa de todas as branches

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

BASE_BRANCH="work/batch-20260313-211756-01-security-fixes"
WORK_BRANCH="work/integration-all-$(date +%Y%m%d-%H%M%S)"

echo "=========================================="
echo "🚀 FASE 2-5: MERGE EM MASSA DE BRANCHES"
echo "=========================================="
echo "Branch base: $BASE_BRANCH"
echo "Nova branch: $WORK_BRANCH"
echo ""

# Criar branch de trabalho
git checkout -b "$WORK_BRANCH" "$BASE_BRANCH"

# Buscar todas as branches feat e fix
FEATURES=$(git branch -r | grep "origin/feat/" | sed 's/^[[:space:]]*origin\///' | head -20)
FIXES=$(git branch -r | grep "origin/fix/" | grep -v -E "(security|sandbox|traversal|lfi)" | sed 's/^[[:space:]]*origin\///' | head -30)

TOTAL_FEAT=$(echo "$FEATURES" | grep -v "^$" | wc -l)
TOTAL_FIX=$(echo "$FIXES" | grep -v "^$" | wc -l)
TOTAL=$((TOTAL_FEAT + TOTAL_FIX))

echo "Branches a processar:"
echo "  Features: $TOTAL_FEAT"
echo "  Fixes: $TOTAL_FIX"
echo "  Total: $TOTAL"
echo ""

SUCCESS=0
FAILED=0
SKIP=0

process_branch() {
    local branch=$1
    local type=$2
    
    # Verificar se branch já foi mergeada
    if git branch --merged HEAD | grep -q "$branch"; then
        echo "  ↩️  $type/$branch já integrada, pulando..."
        SKIP=$((SKIP + 1))
        return 0
    fi
    
    echo "  🔄 Processando $type/$branch..."
    
    if git merge "origin/$branch" --no-ff -m "merge($type): integrate $branch" 2>/tmp/merge-$$.log; then
        echo "  ✅ Integrada com sucesso"
        SUCCESS=$((SUCCESS + 1))
        return 0
    else
        # Tentar auto-resolver
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml docs/docs.json 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml docs/docs.json 2>/dev/null || true
        
        # Verificar se resolveu
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            git commit -m "merge($type): integrate $branch (auto-resolved)" 2>/dev/null
            echo "  ✅ Auto-resolvida"
            SUCCESS=$((SUCCESS + 1))
            return 0
        else
            echo "  ❌ Falhou ($CONFLICTS conflitos)"
            git merge --abort 2>/dev/null || true
            FAILED=$((FAILED + 1))
            return 1
        fi
    fi
}

# Processar features
echo "Processando features..."
echo "$FEATURES" | while read -r branch; do
    [ -z "$branch" ] && continue
    process_branch "$branch" "feat"
done

# Processar fixes
echo ""
echo "Processando fixes..."
echo "$FIXES" | while read -r branch; do
    [ -z "$branch" ] && continue
    process_branch "$branch" "fix"
done

echo ""
echo "=========================================="
echo "📊 RESUMO FINAL"
echo "=========================================="
echo "Total processado: $TOTAL"
echo "Sucessos: $SUCCESS"
echo "Falhas: $FAILED"
echo "Puladas: $SKIP"
echo ""
echo "Branch de trabalho: $WORK_BRANCH"
echo "Commits totais: $(git rev-list --count $BASE_BRANCH..HEAD 2>/dev/null || echo "0")"

rm -f /tmp/merge-$$.log
