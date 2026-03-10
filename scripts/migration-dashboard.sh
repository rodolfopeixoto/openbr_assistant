#!/bin/bash
#
# Dashboard de Progresso da Migração
# Uso: ./scripts/migration-dashboard.sh
#

echo "=========================================="
echo "📊 DASHBOARD DE MIGRAÇÃO"
echo "   2026.1.30 → 2026.3.7"
echo "=========================================="

TOTAL_BATCHES=11
TOTAL_COMMITS=5267

echo ""
echo "📈 Progresso por Lote:"
echo "----------------------------------------"

for i in $(seq 1 $TOTAL_BATCHES); do
    BRANCH_NAME="migration/batch-$(printf "%03d" $i)"
    
    if git show-ref --verify --quiet refs/heads/$BRANCH_NAME 2>/dev/null; then
        # Verificar se foi mergeado para develop
        if git branch --merged develop | grep -q $BRANCH_NAME; then
            STATUS="✅ MERGEADO"
        else
            STATUS="🟡 EM PROGRESSO"
        fi
    else
        STATUS="⚪ PENDENTE"
    fi
    
    START=$(( (i - 1) * 500 + 1 ))
    END=$(( i * 500 ))
    if [ $END -gt $TOTAL_COMMITS ]; then
        END=$TOTAL_COMMITS
    fi
    
    printf "Lote %02d: Commits %4d-%4d | %s\n" $i $START $END "$STATUS"
done

echo ""
echo "📋 Branches de Migração:"
echo "----------------------------------------"
git branch -a | grep "migration/" || echo "   Nenhum branch de migração encontrado"

echo ""
echo "🏷️  Tags de Backup:"
echo "----------------------------------------"
git tag -l | grep "migration/backup" | head -5 || echo "   Nenhuma tag de backup"

echo ""
echo "🎯 Próximo Lote:"
echo "----------------------------------------"
NEXT_BATCH=1
for i in $(seq 1 $TOTAL_BATCHES); do
    BRANCH_NAME="migration/batch-$(printf "%03d" $i)"
    if ! git show-ref --verify --quiet refs/heads/$BRANCH_NAME 2>/dev/null; then
        NEXT_BATCH=$i
        break
    fi
done

if [ $NEXT_BATCH -le $TOTAL_BATCHES ]; then
    echo "   Lote $NEXT_BATCH está pronto para iniciar"
    echo ""
    echo "   Comandos:"
    echo "   1. ./scripts/migration-analyze.sh $NEXT_BATCH"
    echo "   2. ./scripts/migration-apply.sh $NEXT_BATCH"
    echo "   3. ./scripts/migration-validate.sh"
else
    echo "   ✅ Todos os lotes foram criados!"
    echo ""
    echo "   Próximo passo: Merge final para develop"
fi

echo ""
echo "=========================================="

# Gerar arquivo de progresso
PROGRESS_FILE="MIGRATION-PROGRESS.md"
cat > $PROGRESS_FILE << EOF
# Progresso da Migração 2026.3.7

**Atualizado:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Status por Lote

| Lote | Commits | Status | Data |
|------|---------|--------|------|
EOF

for i in $(seq 1 $TOTAL_BATCHES); do
    BRANCH_NAME="migration/batch-$(printf "%03d" $i)"
    START=$(( (i - 1) * 500 + 1 ))
    END=$(( i * 500 ))
    if [ $END -gt $TOTAL_COMMITS ]; then
        END=$TOTAL_COMMITS
    fi
    
    if git show-ref --verify --quiet refs/heads/$BRANCH_NAME 2>/dev/null; then
        if git branch --merged develop | grep -q $BRANCH_NAME; then
            echo "| $i | $START-$END | ✅ Completo | - |" >> $PROGRESS_FILE
        else
            echo "| $i | $START-$END | 🟡 Em Progresso | - |" >> $PROGRESS_FILE
        fi
    else
        echo "| $i | $START-$END | ⚪ Pendente | - |" >> $PROGRESS_FILE
    fi
done

cat >> $PROGRESS_FILE << EOF

## Checklist Final

- [ ] Todos os lotes processados
- [ ] Build passando
- [ ] Testes passando
- [ ] Desktop funcionando
- [ ] Documentação atualizada

## Arquivos

- Especificação: \`specs/active/SPEC-MIGRATION-001.md\`
- Progresso: \`MIGRATION-PROGRESS.md\`
EOF

echo "📄 Progresso salvo em: $PROGRESS_FILE"
