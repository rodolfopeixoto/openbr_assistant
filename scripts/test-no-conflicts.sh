#!/bin/bash
# test-no-conflicts.sh - Testa se não há conflitos no projeto

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

echo "🧪 TESTE: Verificando ausência de conflitos de merge"
echo "====================================================="
echo ""

# Teste 1: Verificar marcadores de conflito
echo "Teste 1: Verificando marcadores <<<<<<< HEAD..."
CONFLICTS=$(grep -r "<<<<<<< HEAD" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | wc -l)

if [ $CONFLICTS -eq 0 ]; then
    echo "  ✅ PASSOU - Nenhum marcador de conflito encontrado"
else
    echo "  ❌ FALHOU - $CONFLICTS arquivos com conflitos:"
    grep -r "<<<<<<< HEAD" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | cut -d: -f1 | sort -u | head -5 | sed 's/^/    - /'
fi

# Teste 2: Verificar =======
echo ""
echo "Teste 2: Verificando marcadores =======..."
SEPARATORS=$(grep -r "^=======$" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | wc -l)

if [ $SEPARATORS -eq 0 ]; then
    echo "  ✅ PASSOU - Nenhum separador de conflito encontrado"
else
    echo "  ❌ FALHOU - $SEPARATORS separadores encontrados"
fi

# Teste 3: Verificar >>>>>>>
echo ""
echo "Teste 3: Verificando marcadores >>>>>>>..."
END_MARKERS=$(grep -r ">>>>>>>" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | wc -l)

if [ $END_MARKERS -eq 0 ]; then
    echo "  ✅ PASSOU - Nenhum marcador final de conflito encontrado"
else
    echo "  ❌ FALHOU - $END_MARKERS marcadores finais encontrados"
fi

# Resumo
echo ""
echo "====================================================="
TOTAL_ISSUES=$((CONFLICTS + SEPARATORS + END_MARKERS))

if [ $TOTAL_ISSUES -eq 0 ]; then
    echo "🎉 TODOS OS TESTES PASSARAM!"
    echo "   Nenhum conflito de merge encontrado no projeto."
    exit 0
else
    echo "⚠️  $TOTAL_ISSUES problemas encontrados"
    echo "   Execute: ./scripts/fix-all-conflicts.sh"
    exit 1
fi
