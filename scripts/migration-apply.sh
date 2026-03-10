#!/bin/bash
#
# Script de Aplicação de Lote
# Uso: ./scripts/migration-apply.sh [batch_number]
#

set -e

BATCH_SIZE=500
TOTAL_COMMITS=5267

if [ -z "$1" ]; then
    echo "❌ Uso: $0 [batch_number]"
    echo "   Exemplo: $0 1 (para aplicar commits 1-500)"
    exit 1
fi

BATCH_NUM=$1
BATCH_START=$(( (BATCH_NUM - 1) * BATCH_SIZE + 1 ))
BATCH_END=$(( BATCH_NUM * BATCH_SIZE ))

if [ $BATCH_END -gt $TOTAL_COMMITS ]; then
    BATCH_END=$TOTAL_COMMITS
fi

echo "=========================================="
echo "🚀 APLICANDO LOTE $BATCH_NUM"
echo "   Commits: $BATCH_START a $BATCH_END"
echo "=========================================="

# Verificar se branch base existe
BASE_BRANCH="migration/batch-$(printf "%03d" $((BATCH_NUM - 1)))"
if [ $BATCH_NUM -eq 1 ]; then
    BASE_BRANCH="refs/heads/develop"
fi

if ! git show-ref --verify --quiet $BASE_BRANCH 2>/dev/null; then
    echo "⚠️  Branch base não encontrada: $BASE_BRANCH"
    echo "   Usando develop como base"
    BASE_BRANCH="refs/heads/develop"
fi

# Criar branch para o lote
BRANCH_NAME="migration/batch-$(printf "%03d" $BATCH_NUM)"
echo ""
echo "📁 Criando branch: $BRANCH_NAME"
git checkout -b $BRANCH_NAME $BASE_BRANCH 2>&1

# Obter hashes dos commits
COMMIT_START=$(git log --oneline v2026.1.30..v2026.3.7 | sed -n "${BATCH_START}p" | awk '{print $1}')
COMMIT_END=$(git log --oneline v2026.1.30..v2026.3.7 | sed -n "${BATCH_END}p" | awk '{print $1}')

echo ""
echo "📋 Commits selecionados:"
echo "   Início: $COMMIT_START"
echo "   Fim: $COMMIT_END"

# Criar backup antes de aplicar
echo ""
echo "💾 Criando backup..."
git tag -a "migration/backup-$(printf "%03d" $BATCH_NUM)" -m "Backup antes do lote $BATCH_NUM"

# Aplicar commits com cherry-pick
echo ""
echo "🔨 Aplicando commits..."
echo "   Isso pode levar alguns minutos..."

# Extrair lista de commits
COMMITS=$(git log --reverse --format="%H" $COMMIT_START^..$COMMIT_END)
TOTAL=$(echo "$COMMITS" | wc -l)
CURRENT=0

for COMMIT in $COMMITS; do
    CURRENT=$((CURRENT + 1))
    echo "   [$CURRENT/$TOTAL] $(git log -1 --format="%h %s" $COMMIT)"
    
    # Tentar cherry-pick
    if git cherry-pick --no-commit $COMMIT 2>&1; then
        echo "      ✅ Sucesso"
    else
        echo ""
        echo "=========================================="
        echo "⚠️  CONFLITO DETECTADO!"
        echo "=========================================="
        echo ""
        echo "Arquivos em conflito:"
        git diff --name-only --diff-filter=U
        echo ""
        echo "Opções:"
        echo "1. Resolver manualmente e continuar"
        echo "2. Pular este commit (--skip)"
        echo "3. Abortar cherry-pick"
        echo ""
        read -p "Escolha (1/2/3): " -n 1 -r
        echo
        
        case $REPLY in
            1)
                echo "Resolva os conflitos e pressione Enter para continuar..."
                read
                git add -A
                ;;
            2)
                git cherry-pick --skip
                echo "      ⏭️  Commit pulado"
                ;;
            3)
                git cherry-pick --abort
                echo "❌ Cherry-pick abortado"
                exit 1
                ;;
            *)
                echo "❌ Opção inválida"
                exit 1
                ;;
        esac
    fi
done

echo ""
echo "=========================================="
echo "✅ LOTE $BATCH_NUM APLICADO!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "1. ./scripts/migration-validate.sh"
echo "2. Resolver quaisquer problemas"
echo "3. git add -A"
echo "4. git commit -m \"migration: batch-$(printf "%03d" $BATCH_NUM) complete\""
echo "5. ./scripts/migration-dashboard.sh"
