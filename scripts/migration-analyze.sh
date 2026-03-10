#!/bin/bash
#
# Script de Análise de Commits para Migração
# Uso: ./scripts/migration-analyze.sh [batch_number]
#

set -e

BATCH_SIZE=500
TOTAL_COMMITS=5267

if [ -z "$1" ]; then
    echo "❌ Uso: $0 [batch_number]"
    echo "   Exemplo: $0 1 (para analisar commits 1-500)"
    exit 1
fi

BATCH_NUM=$1
BATCH_START=$(( (BATCH_NUM - 1) * BATCH_SIZE + 1 ))
BATCH_END=$(( BATCH_NUM * BATCH_SIZE ))

if [ $BATCH_END -gt $TOTAL_COMMITS ]; then
    BATCH_END=$TOTAL_COMMITS
fi

echo "=========================================="
echo "📊 ANÁLISE DE LOTE $BATCH_NUM"
echo "   Commits: $BATCH_START a $BATCH_END"
echo "=========================================="

# Obter lista de commits
echo ""
echo "📝 Commits no lote:"
echo "----------------------------------------"
git log --oneline v2026.1.30..v2026.3.7 | sed -n "${BATCH_START},${BATCH_END}p" | head -20

if [ $((BATCH_END - BATCH_START)) -gt 20 ]; then
    echo "... ($(($BATCH_END - BATCH_START - 20)) commits adicionais)"
fi

# Arquivos modificados
echo ""
echo "📁 Arquivos modificados:"
echo "----------------------------------------"
COMMIT_START=$(git log --oneline v2026.1.30..v2026.3.7 | sed -n "${BATCH_START}p" | awk '{print $1}')
COMMIT_END=$(git log --oneline v2026.1.30..v2026.3.7 | sed -n "${BATCH_END}p" | awk '{print $1}')

git diff --name-only $COMMIT_START^..$COMMIT_END 2>/dev/null | sort | uniq | head -30
FILE_COUNT=$(git diff --name-only $COMMIT_START^..$COMMIT_END 2>/dev/null | wc -l)
echo ""
echo "   Total: $FILE_COUNT arquivos"

# Testes afetados
echo ""
echo "🧪 Testes afetados:"
echo "----------------------------------------"
TEST_FILES=$(git diff --name-only $COMMIT_START^..$COMMIT_END 2>/dev/null | grep -E "\.test\.(ts|js)$" || true)
if [ -n "$TEST_FILES" ]; then
    echo "$TEST_FILES"
else
    echo "   Nenhum teste modificado"
fi

# Breaking changes
echo ""
echo "⚠️  Potenciais Breaking Changes:"
echo "----------------------------------------"
BREAKING_COMMITS=$(git log --grep="BREAKING\|breaking change\|deprecated\|remove\|delete" -i --oneline $COMMIT_START^..$COMMIT_END 2>/dev/null || true)
if [ -n "$BREAKING_COMMITS" ]; then
    echo "$BREAKING_COMMITS"
else
    echo "   Nenhum breaking change identificado"
fi

# Áreas impactadas
echo ""
echo "🎯 Áreas Impactadas:"
echo "----------------------------------------"
git diff --name-only $COMMIT_START^..$COMMIT_END 2>/dev/null | cut -d'/' -f1 | sort | uniq -c | sort -rn | head -10

# Gerar relatório
REPORT_FILE="migration-batch-$(printf "%03d" $BATCH_NUM)-analysis.md"
cat > $REPORT_FILE << EOF
# Análise Lote $BATCH_NUM

**Data:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Commits:** $BATCH_START a $BATCH_END  
**Status:** 🟡 PENDENTE

## Resumo
- Total de arquivos modificados: $FILE_COUNT
- Testes afetados: $(echo "$TEST_FILES" | wc -l)
- Breaking changes: $(echo "$BREAKING_COMMITS" | wc -l)

## Commits Principais
$(git log --oneline $COMMIT_START^..$COMMIT_END | head -10)

## Arquivos Modificados
$(git diff --name-only $COMMIT_START^..$COMMIT_END | sort)

## Testes
$(echo "$TEST_FILES")

## Breaking Changes
$(echo "$BREAKING_COMMITS")

## Próximos Passos
- [ ] Analisar conflitos potenciais
- [ ] Preparar ambiente de teste
- [ ] Executar cherry-pick
- [ ] Resolver conflitos
- [ ] Rodar testes
- [ ] Documentar mudanças
EOF

echo ""
echo "✅ Relatório gerado: $REPORT_FILE"
echo "=========================================="
