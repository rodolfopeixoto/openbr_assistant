#!/bin/bash
# gradual-merge.sh - Script para merge gradual de branches restantes
# Uso: ./scripts/gradual-merge.sh [batch-size]

set -e

BATCH_SIZE=${1:-5}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

BRANCH_FILE=".branches-to-merge.txt"
PROGRESS_FILE=".merge-progress.txt"

echo "=========================================="
echo "🔄 MERGE GRADUAL DE BRANCHES"
echo "=========================================="
echo "Lote: $BATCH_SIZE branches por vez"
echo ""

# Verificar se existe progresso anterior
if [ -f "$PROGRESS_FILE" ]; then
    PROCESSED=$(cat "$PROGRESS_FILE")
    echo "📋 Progresso anterior: $PROCESSED branches processadas"
else
    PROCESSED=0
fi

# Gerar lista de branches restantes se não existir
if [ ! -f "$BRANCH_FILE" ]; then
    echo "📝 Gerando lista de branches..."
    
    # Separar em categorias
    echo "# Features" > "$BRANCH_FILE"
    git branch -r | grep "origin/feat/" | sed 's/^[[:space:]]*origin\///' >> "$BRANCH_FILE"
    
    echo "" >> "$BRANCH_FILE"
    echo "# Fixes (não-security)" >> "$BRANCH_FILE"
    git branch -r | grep "origin/fix/" | grep -v -E "(security|sandbox|traversal|lfi)" | sed 's/^[[:space:]]*origin\///' >> "$BRANCH_FILE"
    
    echo "" >> "$BRANCH_FILE"
    echo "# Outras" >> "$BRANCH_FILE"
    git branch -r | grep -E "origin/(refactor|docs|chore|ci)/" | sed 's/^[[:space:]]*origin\///' >> "$BRANCH_FILE"
    
    TOTAL=$(grep -v "^#" "$BRANCH_FILE" | grep -v "^$" | wc -l)
    echo "✅ Lista gerada: $TOTAL branches"
fi

# Contar total
TOTAL=$(grep -v "^#" "$BRANCH_FILE" | grep -v "^$" | wc -l)
REMAINING=$((TOTAL - PROCESSED))

echo "📊 Status: $PROCESSED/$TOTAL processadas"
echo "🎯 Restantes: $REMAINING"
echo ""

# Pegar próximo lote
BATCH=$(grep -v "^#" "$BRANCH_FILE" | grep -v "^$" | tail -n +$((PROCESSED + 1)) | head -n $BATCH_SIZE)

if [ -z "$BATCH" ]; then
    echo "✅ TODAS AS BRANCHES FORAM PROCESSADAS!"
    rm -f "$BRANCH_FILE" "$PROGRESS_FILE"
    exit 0
fi

echo "📦 Processando lote de $BATCH_SIZE branches:"
echo "$BATCH" | nl
echo ""

SUCCESS=0
FAILED=0

# Processar cada branch do lote
echo "$BATCH" | while read -r branch; do
    [ -z "$branch" ] && continue
    
    echo "----------------------------------------"
    echo "🔄 Processando: $branch"
    
    # Tentar merge
    if git merge "origin/$branch" --no-ff -m "merge: integrate $branch" 2>/tmp/merge-gradual.log; then
        echo "✅ Integrada com sucesso"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "⚠️  Conflitos detectados, tentando auto-resolver..."
        
        # Auto-resolver arquivos comuns
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        
        # Verificar conflitos restantes
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            git commit -m "merge: integrate $branch (auto-resolved)" 2>/dev/null
            echo "✅ Auto-resolvida"
            SUCCESS=$((SUCCESS + 1))
        else
            echo "❌ Falhou ($CONFLICTS conflitos) - pulando..."
            git merge --abort 2>/dev/null || true
            echo "$branch" >> .branches-failed.txt
            FAILED=$((FAILED + 1))
        fi
    fi
done

# Atualizar progresso
NEW_PROCESSED=$((PROCESSED + BATCH_SIZE))
echo "$NEW_PROCESSED" > "$PROGRESS_FILE"

echo ""
echo "=========================================="
echo "📊 RESUMO DO LOTE"
echo "=========================================="
echo "Processadas: $((SUCCESS + FAILED))"
echo "Sucessos: $SUCCESS"
echo "Falhas: $FAILED"
echo ""
echo "Progresso total: $NEW_PROCESSED/$TOTAL"
echo ""

# Validar build
echo "🔧 Validando build..."
if pnpm build >/tmp/build-gradual.log 2>&1; then
    echo "✅ Build passou!"
    echo ""
    echo "🎉 LOTE CONCLUÍDO COM SUCESSO!"
    echo ""
    echo "Próximo passo: Execute novamente para processar mais branches"
    echo "  ./scripts/gradual-merge.sh $BATCH_SIZE"
else
    echo "❌ Build falhou - rever alterações"
    echo "Log: /tmp/build-gradual.log"
    exit 1
fi
