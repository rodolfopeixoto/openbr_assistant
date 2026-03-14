#!/bin/bash
# fix-all-conflicts.sh - Corrige TODOS os marcadores de conflito no projeto

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

echo "🔧 CORRIGINDO TODOS OS CONFLITOS DE MERGE"
echo "=========================================="
echo ""

# Contar total
TOTAL=$(grep -r "<<<<<<< HEAD" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | wc -l)

echo "📊 Total de arquivos com conflitos: $TOTAL"
echo ""

# Lista de arquivos (excluindo node_modules)
FILES=$(grep -r "<<<<<<< HEAD" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | cut -d: -f1 | sort -u)

FIXED=0

for file in $FILES; do
    echo "Processando: $file"
    
    # Verificar se arquivo existe
    [ ! -f "$file" ] && continue
    
    # Criar backup
    cp "$file" "$file.bak"
    
    # Estratégia: manter a versão "theirs" (remover seção HEAD, manter após =======)
    # Usar sed para remover conflitos
    
    # Remover blocos de conflito mantendo a versão "theirs"
    # Padrão: <<<<<<< HEAD ... ======= ... >>>>>>> branch
    # Resultado: manter apenas o conteúdo entre ======= e >>>>>>>
    
    awk '
    BEGIN { in_conflict = 0; keep_theirs = 0 }
    /^<<<<<<</ { in_conflict = 1; keep_theirs = 0; next }
    /^=======/ { keep_theirs = 1; next }
    /^>>>>>>>/ { in_conflict = 0; keep_theirs = 0; next }
    { if (!in_conflict || keep_theirs) print }
    ' "$file" > "$file.tmp"
    
    # Verificar se ainda há conflitos
    if ! grep -q "<<<<<<< HEAD" "$file.tmp"; then
        mv "$file.tmp" "$file"
        rm -f "$file.bak"
        echo "  ✅ Conflitos resolvidos"
        FIXED=$((FIXED + 1))
    else
        echo "  ⚠️  Ainda há conflitos complexos"
        mv "$file.bak" "$file"
        rm -f "$file.tmp"
    fi
done

echo ""
echo "=========================================="
echo "📊 RESULTADO:"
echo "  Total: $TOTAL"
echo "  Corrigidos: $FIXED"
echo "  Restantes: $((TOTAL - FIXED))"
echo ""

# Verificar se ainda há conflitos
REMAINING=$(grep -r "<<<<<<< HEAD" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | wc -l)

echo "Conflitos restantes: $REMAINING"

if [ $REMAINING -eq 0 ]; then
    echo ""
    echo "🎉 TODOS OS CONFLITOS FORAM RESOLVIDOS!"
else
    echo ""
    echo "⚠️  Alguns conflitos precisam de atenção manual"
    echo "Arquivos:"
    grep -r "<<<<<<< HEAD" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | cut -d: -f1 | sort -u
fi
