#!/bin/bash
# integrate-remote-branches.sh - Integração de branches remotas

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

echo "🚀 INTEGRAÇÃO DE BRANCHES REMOTAS"
echo "================================="
echo "Início: $(date)"
echo ""

# Garantir que estamos na develop
git checkout develop
git pull origin develop 2>/dev/null || true

# Gerar lista atualizada de branches remotas
git branch -r | grep "origin/" | grep -E "(feat|fix)/" | sed 's/origin\///' | sort -u > .remote-branches.txt

TOTAL=$(wc -l < .remote-branches.txt)
ALREADY=$(git branch -r --merged develop | grep -E "origin/(feat|fix)/" | wc -l)
PENDING=$((TOTAL - ALREADY))

echo "📊 Estatísticas:"
echo "  Total: $TOTAL"
echo "  Já mergeadas: $ALREADY"
echo "  Pendentes: $PENDING"
echo ""

if [ $PENDING -eq 0 ]; then
    echo "✅ Todas as branches já estão integradas!"
    exit 0
fi

SUCCESS=0
FAILED=0
COUNT=0

echo "🔄 Iniciando integração..."
echo ""

while IFS= read -r BRANCH; do
    [ -z "$BRANCH" ] && continue
    
    COUNT=$((COUNT + 1))
    
    # Verificar se já está mergeada
    if git branch -r --merged develop | grep -q "origin/$BRANCH"; then
        continue
    fi
    
    echo "[$COUNT/$TOTAL] $BRANCH - Processando..."
    
    # Tentar merge
    if git merge "origin/$BRANCH" --no-ff -m "merge: integrate $BRANCH" 2>/tmp/merge-$COUNT.log; then
        echo "  ✅ Merge limpo"
        SUCCESS=$((SUCCESS + 1))
    else
        # Tentar auto-resolver
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            git commit -m "merge: integrate $BRANCH (auto-resolved)" 2>/dev/null
            echo "  ✅ Auto-resolvido"
            SUCCESS=$((SUCCESS + 1))
        else
            echo "  ❌ Falhou ($CONFLICTS conflitos)"
            echo "$BRANCH" >> .failed-branches.txt
            git merge --abort 2>/dev/null || git reset --hard HEAD
            FAILED=$((FAILED + 1))
        fi
    fi
    
    # Progresso
    if [ $((COUNT % 10)) -eq 0 ]; then
        echo ""
        echo "📈 Progresso: $COUNT processadas | $SUCCESS sucessos | $FAILED falhas"
        echo ""
    fi
done < .remote-branches.txt

echo ""
echo "================================="
echo "📊 RESULTADO FINAL"
echo "================================="
echo "  ✅ Sucessos: $SUCCESS"
echo "  ❌ Falhas: $FAILED"
echo "  📦 Total integrado: $((ALREADY + SUCCESS))"
echo ""

# Build
echo "🔨 Validando build..."
if pnpm build >/tmp/build.log 2>&1; then
    echo "  ✅ Build passou!"
else
    echo "  ❌ Build falhou"
fi

echo ""
echo "Fim: $(date)"
