#!/bin/bash
# smart-consolidate.sh - Consolida branches na develop de forma inteligente
# Pula branches com conflitos e continua com as próximas

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

if [ "$(git branch --show-current)" != "develop" ]; then
    echo "❌ Execute da branch develop"
    exit 1
fi

echo "🧠 CONSOLIDAÇÃO INTELIGENTE PARA DEVELOP"
echo "========================================="
echo ""

# Limpar arquivos antigos
rm -f .smart-merge-*.txt

# Gerar lista de branches pendentes
echo "📋 Gerando lista de branches..."
git branch -r | grep -E "origin/(feat|fix)/" | sed 's/^[[:space:]]*origin\///' > .smart-merge-all.txt

TOTAL=$(wc -l < .smart-merge-all.txt)
echo "Total: $TOTAL branches"
echo ""

# Verificar quais já estão mergeadas
echo "🔍 Verificando branches já mergeadas..."
while IFS= read -r branch; do
    if git branch -r --merged develop | grep -q "origin/$branch"; then
        echo "$branch:merged" >> .smart-merge-status.txt
    else
        echo "$branch:pending" >> .smart-merge-status.txt
    fi
done < .smart-merge-all.txt

MERGED=$(grep ":merged" .smart-merge-status.txt | wc -l)
PENDING=$(grep ":pending" .smart-merge-status.txt | wc -l)

echo "  ✅ Já na develop: $MERGED"
echo "  ⏳ Pendentes: $PENDING"
echo ""

if [ $PENDING -eq 0 ]; then
    echo "✅ Todas as branches já estão na develop!"
    exit 0
fi

SUCCESS=0
FAILED=0
COUNT=0

echo "🚀 Iniciando merges..."
echo ""

# Processar branches pendentes
grep ":pending" .smart-merge-status.txt | cut -d: -f1 | while read -r branch; do
    COUNT=$((COUNT + 1))
    printf "[%3d/%3d] %-55s" "$COUNT" "$PENDING" "$branch"
    
    # Tentar merge
    if git merge "origin/$branch" --no-ff -m "merge: integrate $branch" >/dev/null 2>&1; then
        echo "✅"
        echo "$branch:success" >> .smart-merge-results.txt
        SUCCESS=$((SUCCESS + 1))
    else
        # Tentar resolver conflitos comuns
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            git commit -m "merge: integrate $branch (auto)" >/dev/null 2>&1
            echo "⚡"
            echo "$branch:success" >> .smart-merge-results.txt
            SUCCESS=$((SUCCESS + 1))
        else
            echo "❌"
            git merge --abort 2>/dev/null || true
            echo "$branch:failed" >> .smart-merge-results.txt
            echo "$branch" >> .smart-merge-failed.txt
            FAILED=$((FAILED + 1))
        fi
    fi
done

echo ""
echo "========================================="
echo "📊 RESULTADO:"
echo "  ✅ Integradas: $SUCCESS"
echo "  ❌ Falhas: $FAILED"
echo "  📦 Total na develop: $((MERGED + SUCCESS))"
echo ""

# Build
echo "🔨 Validando build..."
if pnpm build >/tmp/smart-build.log 2>&1; then
    echo "✅ Build passou!"
    
    # Commit
    git add -A
    git commit -m "consolidation: smart merge of pending branches

- Integradas: $SUCCESS
- Falhas: $FAILED
- Total na develop: $((MERGED + SUCCESS))/$TOTAL" 2>/dev/null || echo "Nada para commit"
    
    echo ""
    echo "🎉 Consolidação concluída!"
    echo "Commits na develop: $(git rev-list --count origin/develop..HEAD)"
    
else
    echo "⚠️  Build falhou, tentando corrigir..."
    ./scripts/conflict-checker.sh ./src 2>/dev/null || true
    
    if pnpm build >/tmp/smart-build2.log 2>&1; then
        echo "✅ Build corrigido!"
        git add -A
        git commit -m "consolidation: smart merge with fixes" 2>/dev/null || true
    else
        echo "❌ Build ainda falhando"
    fi
fi

# Mostrar falhas
if [ -f .smart-merge-failed.txt ] && [ $(wc -l < .smart-merge-failed.txt) -gt 0 ]; then
    echo ""
    echo "⚠️  Branches que falharam ($(wc -l < .smart-merge-failed.txt)):"
    cat .smart-merge-failed.txt | head -20 | sed 's/^/  - /'
    
    if [ $(wc -l < .smart-merge-failed.txt) -gt 20 ]; then
        echo "  ... e mais $(( $(wc -l < .smart-merge-failed.txt) - 20 )) branches"
    fi
fi

# Limpar
rm -f .smart-merge-*.txt

echo ""
echo "✅ Processo concluído!"
