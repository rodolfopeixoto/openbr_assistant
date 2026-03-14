#!/bin/bash
# resolve-ts-conflicts.sh - Resolve conflitos em arquivos TypeScript

echo "🔧 Resolvendo conflitos em arquivos TypeScript..."

# Encontrar todos os arquivos com marcadores de conflito
FILES=$(grep -r "<<<<<<<" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | cut -d: -f1 | sort -u)

if [ -z "$FILES" ]; then
    echo "✅ Nenhum conflito encontrado em arquivos TypeScript!"
    exit 0
fi

echo "Arquivos com conflitos:"
echo "$FILES"
echo ""

# Para cada arquivo, usar theirs (versão da branch sendo mergeada)
for file in $FILES; do
    echo "Resolvendo: $file"
    
    # Verificar se é um arquivo novo (add/add conflict) ou modificado
    if git ls-files --unmerged "$file" | grep -q "^160000"; then
        # Arquivo completamente novo em ambas as branches
        # Remover os marcadores e pegar a versão completa "theirs"
        git show :3:"$file" > "$file.tmp" 2>/dev/null || continue
        mv "$file.tmp" "$file"
    else
        # Arquivo modificado - usar theirs
        git checkout --theirs "$file" 2>/dev/null || {
            # Se falhar, tentar extrair manualmente
            sed '/<<<<<<</,/>>>>>>>/d' "$file" > "$file.tmp"
            sed '/=======/d' "$file.tmp" > "$file"
            rm -f "$file.tmp"
        }
    fi
    
    git add "$file"
done

echo ""
echo "✅ Conflitos em TypeScript resolvidos!"
git status --short | grep -E "^M" | wc -l | xargs echo "Arquivos modificados:"
