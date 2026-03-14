#!/bin/bash
# execute-integration.sh - Executa integração completa em 10 lotes

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║           🚀 INTEGRAÇÃO COMPLETA - 143 BRANCHES               ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Este processo vai integrar TODAS as 143 branches restantes."
echo "Será dividido em 10 lotes de ~15 branches cada."
echo ""
echo "Estimativa de tempo: 4-6 horas"
echo ""
echo "Pressione ENTER para começar..."
read

chmod +x scripts/batch-integrate.sh

# Lotes
LOTES=(
    "1:15:Features críticas (prioridade 1)"
    "16:30:Features importantes"
    "31:45:Features médias"
    "46:60:Fixes críticos"
    "61:75:Fixes importantes"
    "76:90:Fixes médios"
    "91:105:Outras features"
    "106:120:Outros fixes"
    "121:135:Restantes features"
    "136:143:Restantes fixes"
)

TOTAL_LOTES=${#LOTES[@]}
LOTE_ATUAL=0

for lote in "${LOTES[@]}"; do
    IFS=':' read -r INICIO FIM NOME <<< "$lote"
    LOTE_ATUAL=$((LOTE_ATUAL + 1))
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "📦 LOTE $LOTE_ATUAL/$TOTAL_LOTES: $NOME"
    echo "   Branches $INICIO a $FIM"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    ./scripts/batch-integrate.sh "$INICIO" "$FIM"
    
    echo ""
    echo "✅ Lote $LOTE_ATUAL concluído!"
    echo ""
    
    if [ $LOTE_ATUAL -lt $TOTAL_LOTES ]; then
        echo "Pressione ENTER para próximo lote..."
        read
    fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║           ✅ INTEGRAÇÃO COMPLETA FINALIZADA!                  ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 RESUMO:"
echo "  Total de lotes: $TOTAL_LOTES"
echo "  Branches processadas: 143"
echo ""
echo "Logs disponíveis:"
echo "  .integration-batch-*.log"
echo "  .batch-success.txt"
echo "  .batch-failed.txt"
echo ""
echo "Próximo passo: Validar build e fazer push"
