#!/bin/bash
# integrate-features.sh - Integração de branches de features

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

BASE_BRANCH="work/batch-20260313-211756-01-security-fixes"
WORK_BRANCH="work/batch-features-$(date +%Y%m%d-%H%M%S)"

echo "=========================================="
echo "✨ FASE 2: INTEGRAÇÃO DE FEATURES"
echo "=========================================="
echo "Branch base: $BASE_BRANCH"
echo "Branch de trabalho: $WORK_BRANCH"
echo ""

# Criar branch de trabalho
git checkout -b "$WORK_BRANCH" "$BASE_BRANCH"

# Lista de features para integrar (priorizadas)
FEATURES=(
    "feat/chat-ux-improvements"
    "feat/antigravity-integration"
    "feat/config-ui-sections"
    "feat/compaction-safeguard-improvements"
)

TOTAL=${#FEATURES[@]}
SUCCESS=0
FAILED=0

echo "Processando $TOTAL features prioritárias..."
echo ""

for i in "${!FEATURES[@]}"; do
    feature="${FEATURES[$i]}"
    num=$((i + 1))
    
    echo "----------------------------------------"
    echo "[$num/$TOTAL] Processando: $feature"
    echo "----------------------------------------"
    
    if git merge "origin/$feature" --no-ff -m "merge(features): integrate $feature" 2>/dev/null; then
        echo "✅ Merge limpo!"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "⚠️  Conflitos detectados, tentando auto-resolver..."
        
        # Tentar resolver conflitos comuns
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        
        # Verificar se ainda há conflitos
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            git commit -m "merge(features): integrate $feature (auto-resolved)" 2>/dev/null
            echo "✅ Conflitos resolvidos automaticamente!"
            SUCCESS=$((SUCCESS + 1))
        else
            echo "❌ Ainda há $CONFLICTS arquivo(s) com conflitos"
            git merge --abort 2>/dev/null || true
            FAILED=$((FAILED + 1))
        fi
    fi
done

echo ""
echo "=========================================="
echo "📊 RESUMO - FASE 2 (Features Prioritárias)"
echo "=========================================="
echo "Total: $TOTAL"
echo "Sucessos: $SUCCESS"
echo "Falhas: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ TODAS AS FEATURES PRIORITÁRIAS INTEGRADAS!"
    echo "Branch: $WORK_BRANCH"
    echo "Commits: $(git rev-list --count $BASE_BRANCH..HEAD)"
else
    echo "⚠️  $FAILED feature(s) não puderam ser integradas"
fi
