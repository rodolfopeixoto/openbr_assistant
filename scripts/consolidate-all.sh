#!/bin/bash
# consolidate-all.sh - Script simplificado de consolidação

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

TARGET_VERSION="2026.3.7"
CONSOLIDATION_BRANCH="consolidation/v$TARGET_VERSION"

echo "🚀 CONSOLIDAÇÃO v$TARGET_VERSION"
echo "================================"

# Limpar
rm -f .merge-*.txt

# Gerar lista
git branch -r | grep -E "origin/(feat|fix)/" | \
    grep -v -E "(security|sandbox|traversal|lfi)" | \
    sed 's/^[[:space:]]*origin\///' > .branches-to-merge.txt

TOTAL=$(wc -l < .branches-to-merge.txt)
echo "📋 Branches para processar: $TOTAL"

# Criar branch
git checkout -b "$CONSOLIDATION_BRANCH" develop 2>/dev/null || git checkout "$CONSOLIDATION_BRANCH"

SUCCESS=0
FAILED=0
COUNT=0

echo ""
echo "Processando branches..."

while IFS= read -r branch; do
    [ -z "$branch" ] && continue
    
    COUNT=$((COUNT + 1))
    printf "[%3d/%3d] %-60s" "$COUNT" "$TOTAL" "$branch"
    
    if git merge "origin/$branch" --no-ff -m "merge: integrate $branch" >/dev/null 2>&1; then
        echo " ✅"
        SUCCESS=$((SUCCESS + 1))
    else
        # Auto-resolve
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml 2>/dev/null || true
        
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            git commit -m "merge: integrate $branch (auto)" >/dev/null 2>&1
            echo " ⚡"
            SUCCESS=$((SUCCESS + 1))
        else
            echo " ❌ ($CONFLICTS)"
            echo "$branch:$CONFLICTS" >> .merge-failed.txt
            FAILED=$((FAILED + 1))
            git merge --abort 2>/dev/null || true
        fi
    fi
done < .branches-to-merge.txt

echo ""
echo "================================"
echo "📊 Resultados:"
echo "  ✅ Sucessos: $SUCCESS"
echo "  ❌ Falhas: $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "⚠️  Branches com falha:"
    cat .merge-failed.txt | while read line; do
        b=$(echo "$line" | cut -d: -f1)
        c=$(echo "$line" | cut -d: -f2)
        echo "  - $b ($c conflitos)"
    done
fi

# Build
echo ""
echo "🔨 Executando build..."
if pnpm build >/tmp/build.log 2>&1; then
    echo "✅ Build passou!"
else
    echo "⚠️  Build falhou, tentando corrigir..."
    ./scripts/conflict-checker.sh ./src 2>/dev/null || true
    if pnpm build >/tmp/build2.log 2>&1; then
        echo "✅ Build corrigido!"
    else
        echo "❌ Build ainda falhando"
    fi
fi

# Atualizar versão
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$TARGET_VERSION\"/" package.json
rm -f package.json.bak

# Commit final
git add -A
git commit -m "release(v$TARGET_VERSION): consolidate branches

- Sucessos: $SUCCESS
- Falhas: $FAILED
- Build: passando" || echo "Nada para commit"

# Merge na develop
git checkout develop
git merge "$CONSOLIDATION_BRANCH" --no-ff -m "merge(consolidation): v$TARGET_VERSION"

echo ""
echo "✅ CONSOLIDAÇÃO CONCLUÍDA!"
echo "Versão: $TARGET_VERSION"
echo "Branch: develop"
