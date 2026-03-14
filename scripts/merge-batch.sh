#!/bin/bash
# merge-batch.sh - Script para merge de lotes de branches

set -e

BATCH_NAME=$1
BRANCHES_FILE=$2
BASE_BRANCH=${3:-"origin/develop"}

if [ -z "$BATCH_NAME" ] || [ -z "$BRANCHES_FILE" ]; then
    echo "Uso: $0 <nome-do-lote> <arquivo-com-branches> [branch-base]"
    echo "Exemplo: $0 security-fixes branches-security.txt"
    exit 1
fi

echo "=========================================="
echo "📦 MERGE DE LOTE: $BATCH_NAME"
echo "=========================================="
echo "Branch base: $BASE_BRANCH"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Criar branch de trabalho
WORK_BRANCH="work/batch-$(date +%Y%m%d-%H%M%S)-$BATCH_NAME"
echo -e "${BLUE}Criando branch de trabalho: $WORK_BRANCH${NC}"

# Remover branch se já existir
if git branch | grep -q "$WORK_BRANCH"; then
    git branch -D "$WORK_BRANCH" 2>/dev/null || true
fi

git checkout -b "$WORK_BRANCH" "$BASE_BRANCH"

# Contador
TOTAL=$(wc -l < "$BRANCHES_FILE")
CURRENT=0
SUCCESS=0
FAILED=0

# Processar cada branch
while IFS= read -r branch; do
    [ -z "$branch" ] && continue
    [[ "$branch" =~ ^# ]] && continue
    
    CURRENT=$((CURRENT + 1))
    echo ""
    echo "----------------------------------------"
    echo -e "${YELLOW}[$CURRENT/$TOTAL] Processando: $branch${NC}"
    echo "----------------------------------------"
    
    # Tentar merge (adicionar origin/ se não tiver)
    REMOTE_BRANCH="$branch"
    if [[ ! "$branch" =~ ^origin/ ]]; then
        REMOTE_BRANCH="origin/$branch"
    fi
    
    if git merge "$REMOTE_BRANCH" --no-ff -m "merge($BATCH_NAME): integrate $branch"; then
        echo -e "${GREEN}✓ Merge bem-sucedido: $branch${NC}"
        
        # Validar
        if ./scripts/validate-merge.sh; then
            echo -e "${GREEN}✓ Validação passou: $branch${NC}"
            SUCCESS=$((SUCCESS + 1))
        else
            echo -e "${RED}✗ Validação falhou: $branch${NC}"
            echo -e "${YELLOW}Revertendo merge...${NC}"
            git reset --hard HEAD~1
            FAILED=$((FAILED + 1))
        fi
    else
        echo -e "${RED}✗ Merge falhou: $branch${NC}"
        echo -e "${YELLOW}Abortando merge...${NC}"
        git merge --abort 2>/dev/null || true
        FAILED=$((FAILED + 1))
    fi
done < "$BRANCHES_FILE"

echo ""
echo "=========================================="
echo "📊 RESUMO DO LOTE: $BATCH_NAME"
echo "=========================================="
echo -e "${GREEN}Sucessos: $SUCCESS${NC}"
echo -e "${RED}Falhas: $FAILED${NC}"
echo "Total: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ TODOS OS MERGES DO LOTE BEM-SUCEDIDOS!${NC}"
    echo "Branch de trabalho: $WORK_BRANCH"
    echo ""
    echo "Próximo passo: Criar PR para integration/mainline"
else
    echo -e "${YELLOW}⚠️  ALGUNS MERGES FALHARAM${NC}"
    echo "Branch de trabalho: $WORK_BRANCH (parcial)"
    echo ""
    echo "Verificar branches que falharam e tentar novamente."
fi

exit $FAILED
