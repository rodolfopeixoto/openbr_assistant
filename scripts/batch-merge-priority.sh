#!/bin/bash
# batch-merge-priority.sh - Integra branches prioritárias em lote

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

# Lista de prioridades
BRANCHES=(
    "feat/antigravity-integration"
    "feat/chat-ux-improvements"
    "feat/llm-task-tool"
    "feat/lobster-plugin"
    "feat/mattermost-channel"
    "feat/models-command"
    "feat/telegram-dm-threads"
    "feat/telegram-link-preview-config"
)

echo "🚀 INTEGRAÇÃO EM LOTE - 8 BRANCHES PRIORITÁRIAS"
echo "==============================================="
echo ""

SUCCESS=0
FAILED=0

for BRANCH in "${BRANCHES[@]}"; do
    echo ""
    echo "----------------------------------------"
    echo "Processando: $BRANCH"
    echo "----------------------------------------"
    
    # Criar work branch
    WORK="work/batch-$(echo $BRANCH | tr '/' '-')-$(date +%s)"
    git checkout -b "$WORK" develop 2>/dev/null || git checkout "$WORK"
    
    # Tentar merge
    if git merge "origin/$BRANCH" --no-ff -m "merge: integrate $BRANCH" >/tmp/merge-$WORK.log 2>&1; then
        echo "✅ Merge limpo!"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "⚠️  Conflitos detectados, tentando resolver..."
        
        # Auto-resolve arquivos de config
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        
        # Tentar resolver conflitos TypeScript
        ./scripts/conflict-checker.sh ./src 2>/dev/null || true
        ./scripts/conflict-checker.sh ./ui 2>/dev/null || true
        
        # Verificar se resolveu
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            echo "✅ Conflitos resolvidos!"
            git commit -m "merge: integrate $BRANCH (auto-resolved)" >/dev/null 2>&1
            SUCCESS=$((SUCCESS + 1))
        else
            echo "❌ Falhou ($CONFLICTS conflitos manuais)"
            echo "$BRANCH" >> .batch-failed.txt
            git merge --abort 2>/dev/null || true
            FAILED=$((FAILED + 1))
        fi
    fi
done

echo ""
echo "==============================================="
echo "📊 RESULTADO:"
echo "  ✅ Sucessos: $SUCCESS"
echo "  ❌ Falhas: $FAILED"
echo ""

if [ $SUCCESS -gt 0 ]; then
    echo "🔨 Validando build..."
    if pnpm build >/tmp/batch-build.log 2>&1; then
        echo "✅ Build passou!"
        
        # Merge na develop
        echo ""
        echo "Fazendo merge na develop..."
        git checkout develop
        
        for WORK in $(git branch | grep "work/batch-" | sed 's/^\*//'); do
            WORK=$(echo "$WORK" | xargs)
            if git merge "$WORK" --no-ff -m "batch: integrate work branches"; then
                git branch -D "$WORK" 2>/dev/null || true
            fi
        done
        
        echo ""
        echo "🎉 LOTE CONCLUÍDO!"
        echo "Commits na develop: $(git rev-list --count origin/develop..HEAD)"
    else
        echo "❌ Build falhou!"
    fi
fi

if [ -f .batch-failed.txt ]; then
    echo ""
    echo "⚠️  Branches que falharam:"
    cat .batch-failed.txt | sed 's/^/  - /'
fi
