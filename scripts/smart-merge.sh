#!/bin/bash
# smart-merge.sh - Resolve conflitos automaticamente quando possível

set -e

BRANCH=$1

if [ -z "$BRANCH" ]; then
    echo "Uso: $0 <branch>"
    exit 1
fi

echo "=========================================="
echo "🧠 SMART MERGE: $BRANCH"
echo "=========================================="

# Tentar merge
if git merge "origin/$BRANCH" --no-ff -m "merge: integrate $BRANCH"; then
    echo "✅ Merge limpo!"
    exit 0
fi

# Se falhou, analisar conflitos
echo "⚠️  Conflitos detectados, analisando..."

# Arquivos que podem usar "theirs" (configurações, lock files, docs gerados)
AUTO_THEIRS=(
    "CHANGELOG.md"
    "package.json"
    "pnpm-lock.yaml"
    "docker-compose.yml"
    "docs/docs.json"
)

# Verificar arquivos em conflito
CONFLICTS=$(git diff --name-only --diff-filter=U)

echo ""
echo "Arquivos em conflito:"
echo "$CONFLICTS"
echo ""

# Para cada arquivo em conflito
for file in $CONFLICTS; do
    if [[ " ${AUTO_THEIRS[@]} " =~ " ${file} " ]]; then
        echo "📝 Resolvendo $file (usando theirs)..."
        git checkout --theirs "$file"
        git add "$file"
    else
        echo "⚠️  $file requer atenção manual (código fonte)"
    fi
done

# Verificar se ainda há conflitos
REMAINING=$(git diff --name-only --diff-filter=U | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo ""
    echo "✅ Todos os conflitos resolvidos automaticamente!"
    git commit -m "merge: integrate $BRANCH (auto-resolved conflicts)"
    exit 0
else
    echo ""
    echo "❌ Ainda há $REMAINING arquivo(s) com conflitos manuais:"
    git diff --name-only --diff-filter=U
    git merge --abort
    exit 1
fi
