#!/bin/bash
# merge-all-to-develop.sh - Merge TODAS as branches restantes na develop

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

echo "🚀 MERGE TOTAL PARA DEVELOP"
echo "============================"
echo ""

# Verificar se estamos na develop
if [ "$(git branch --show-current)" != "develop" ]; then
    echo "❌ Você precisa estar na branch develop!"
    exit 1
fi

# Contar branches
TOTAL=$(git branch -r | grep -E "origin/(feat|fix)/" | wc -l)
ALREADY_MERGED=$(git branch -r --merged develop | grep -E "origin/(feat|fix)/" | wc -l)
REMAINING=$((TOTAL - ALREADY_MERGED))

echo "📊 Status:"
echo "  Total de branches: $TOTAL"
echo "  Já mergeadas: $ALREADY_MERGED"
echo "  Faltando: $REMAINING"
echo ""

if [ $REMAINING -eq 0 ]; then
    echo "✅ Todas as branches já estão na develop!"
    exit 0
fi

SUCCESS=0
FAILED=0
SKIPPED=0

# Função para verificar se branch já está mergeada
is_merged() {
    local branch=$1
    git branch -r --merged develop | grep -q "origin/$branch"
}

# Processar todas as branches
process_branch() {
    local branch=$1
    
    # Verificar se já está mergeada
    if is_merged "$branch"; then
        echo "  ⏭️  $branch (já mergeada)"
        SKIPPED=$((SKIPPED + 1))
        return 0
    fi
    
    printf "  🔄 %-50s" "$branch"
    
    if git merge "origin/$branch" --no-ff -m "merge: integrate $branch" >/dev/null 2>&1; then
        echo "✅"
        SUCCESS=$((SUCCESS + 1))
        return 0
    else
        # Tentar auto-resolver
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml docs/docs.json 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml docs/docs.json 2>/dev/null || true
        
        # Verificar se resolveu
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            git commit -m "merge: integrate $branch (auto-resolved)" >/dev/null 2>&1
            echo "⚡"
            SUCCESS=$((SUCCESS + 1))
            return 0
        else
            echo "❌ ($CONFLICTS conflitos)"
            git merge --abort 2>/dev/null || true
            echo "$branch:$CONFLICTS" >> .remaining-failed.txt
            FAILED=$((FAILED + 1))
            return 1
        fi
    fi
}

echo "Iniciando merge de $REMAINING branches..."
echo ""

# Lista de prioridades (mais importantes primeiro)
PRIORITY_PATTERNS=(
    "feat/antigravity"
    "feat/llm-task"
    "feat/lobster"
    "feat/device-pair"
    "feat/mattermost"
    "feat/models-command"
    "feat/telegram"
    "feat/config-ui"
    "feat/chat-ux"
)

# Primeiro: branches prioritárias
echo "FASE 1: Branches prioritárias..."
for pattern in "${PRIORITY_PATTERNS[@]}"; do
    git branch -r | grep "origin/" | grep "$pattern" | sed 's/^[[:space:]]*origin\///' | while read branch; do
        [ -z "$branch" ] && continue
        process_branch "$branch"
    done
done

# Segundo: todas as outras features
echo ""
echo "FASE 2: Features restantes..."
git branch -r | grep "origin/feat/" | sed 's/^[[:space:]]*origin\///' | while read branch; do
    [ -z "$branch" ] && continue
    if ! is_merged "$branch"; then
        process_branch "$branch"
    fi
done

# Terceiro: todos os fixes
echo ""
echo "FASE 3: Fixes restantes..."
git branch -r | grep "origin/fix/" | sed 's/^[[:space:]]*origin\///' | while read branch; do
    [ -z "$branch" ] && continue
    if ! is_merged "$branch"; then
        process_branch "$branch"
    fi
done

echo ""
echo "============================"
echo "📊 RESUMO FINAL:"
echo "  ✅ Sucessos: $SUCCESS"
echo "  ⚡ Auto-resolvidos: $((SUCCESS - ALREADY_MERGED))"
echo "  ❌ Falhas: $FAILED"
echo "  ⏭️  Puladas: $SKIPPED"
echo ""

# Build
echo "🔨 Validando build..."
if pnpm build >/tmp/final-build.log 2>&1; then
    echo "✅ Build passou!"
    
    # Commit final
    git add -A
    git commit -m "consolidation: merge all remaining branches to develop

- Sucessos: $SUCCESS
- Falhas: $FAILED
- Total processado: $REMAINING
- Build: passing" || echo "Nada para commit"
    
    echo ""
    echo "🎉 CONSOLIDAÇÃO CONCLUÍDA!"
    echo "Total de commits na develop: $(git rev-list --count origin/develop..HEAD)"
    
else
    echo "❌ Build falhou"
    echo "Tentando corrigir conflitos..."
    ./scripts/conflict-checker.sh ./src 2>/dev/null || true
    
    if pnpm build >/tmp/final-build2.log 2>&1; then
        echo "✅ Build corrigido!"
        git add -A
        git commit -m "consolidation: merge all branches (with fixes)" || true
    else
        echo "❌ Ainda falhando - verificar manualmente"
        exit 1
    fi
fi

# Mostrar falhas
if [ $FAILED -gt 0 ] && [ -f .remaining-failed.txt ]; then
    echo ""
    echo "⚠️  Branches que precisam de atenção manual:"
    cat .remaining-failed.txt | while read line; do
        b=$(echo "$line" | cut -d: -f1)
        c=$(echo "$line" | cut -d: -f2)
        echo "  - $b ($c conflitos)"
    done
fi
