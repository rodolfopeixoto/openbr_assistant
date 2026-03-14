#!/bin/bash
# conflict-checker.sh - Verificador e resolvedor de conflitos

set -e

TARGET_DIR=${1:-"./src"}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[CHECKER]${NC} $1"; }
success() { echo -e "${GREEN}[CHECKER]${NC} $1"; }
warn() { echo -e "${YELLOW}[CHECKER]${NC} $1"; }
error() { echo -e "${RED}[CHECKER]${NC} $1"; }

log "🔍 Verificando conflitos em $TARGET_DIR..."

# Encontrar todos os arquivos com marcadores de conflito
CONFLICT_FILES=$(grep -r "<<<<<<<" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" "$TARGET_DIR" 2>/dev/null | cut -d: -f1 | sort -u)

if [ -z "$CONFLICT_FILES" ]; then
    success "✅ Nenhum conflito encontrado!"
    exit 0
fi

TOTAL=$(echo "$CONFLICT_FILES" | grep -v "^$" | wc -l)
warn "⚠️  Encontrados $TOTAL arquivo(s) com conflitos:"
echo "$CONFLICT_FILES"
echo ""

RESOLVED=0
FAILED=0

for file in $CONFLICT_FILES; do
    [ -z "$file" ] && continue
    
    log "Resolvendo: $file"
    
    # Verificar tipo de arquivo
    if [[ "$file" =~ \.(json|md|yml|yaml)$ ]]; then
        # Arquivos de config/docs - usar theirs
        git checkout --theirs "$file" 2>/dev/null || {
            # Fallback: remover seção HEAD
            sed -i.bak '/<<<<<<</,/=======/d' "$file"
            sed -i.bak '/>>>>>>>/d' "$file"
            rm -f "${file}.bak"
        }
    else
        # Arquivos de código - tentar theirs primeiro
        if git checkout --theirs "$file" 2>/dev/null; then
            success "  Usando versão 'theirs'"
        else
            # Fallback: remover manualmente
            warn "  Removendo marcadores manualmente..."
            sed -i.bak '/<<<<<<</,/=======/d' "$file" 2>/dev/null || true
            sed -i.bak '/>>>>>>>/d' "$file" 2>/dev/null || true
            rm -f "${file}.bak" 2>/dev/null || true
        fi
    fi
    
    # Verificar se resolveu
    if ! grep -q "<<<<<<<" "$file" 2>/dev/null; then
        git add "$file" 2>/dev/null || true
        success "  ✅ Resolvido"
        RESOLVED=$((RESOLVED + 1))
    else
        error "  ❌ Ainda tem conflitos"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
log "📊 Resultado:"
success "  Resolvidos: $RESOLVED"
[ $FAILED -gt 0 ] && error "  Falhas: $FAILED"

if [ $FAILED -eq 0 ]; then
    success "✅ Todos os conflitos resolvidos!"
    exit 0
else
    error "❌ Ainda há $FAILED arquivo(s) com conflitos manuais"
    exit 1
fi
