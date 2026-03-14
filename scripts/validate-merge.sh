#!/bin/bash
# validate-merge.sh - Script de validação padrão para cada merge

set -e

echo "=========================================="
echo "🔍 VALIDAÇÃO DE MERGE"
echo "=========================================="
echo "Branch atual: $(git branch --show-current)"
echo "Commit: $(git log -1 --oneline)"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função de validação
validate_step() {
    local step_name=$1
    local command=$2
    
    echo -e "${YELLOW}▶ $step_name...${NC}"
    if eval "$command" > /tmp/validate-$$.log 2>&1; then
        echo -e "${GREEN}✓ $step_name - OK${NC}"
        return 0
    else
        echo -e "${RED}✗ $step_name - FALHOU${NC}"
        echo "Log de erro:"
        cat /tmp/validate-$$.log | tail -20
        return 1
    fi
}

# 1. Instalação de dependências
validate_step "Instalação de dependências" "pnpm install" || exit 1

# 2. Build
validate_step "Build do projeto" "pnpm build" || exit 1

# 3. Lint
validate_step "Linting" "pnpm lint" || exit 1

# 4. Testes unitários
validate_step "Testes unitários" "pnpm test:unit" || exit 1

# 5. Testes de integração (rápidos)
validate_step "Testes de integração" "pnpm test:integration --run" || exit 1

# 6. Verificação de segurança
if command -v detect-secrets &> /dev/null; then
    validate_step "Scan de secrets" "detect-secrets scan" || exit 1
fi

# 7. Verificação de conflitos
if git diff --check; then
    echo -e "${GREEN}✓ Sem conflitos de whitespace${NC}"
else
    echo -e "${RED}✗ Conflitos de whitespace detectados${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ TODAS AS VALIDAÇÕES PASSARAM!${NC}"
echo "=========================================="
echo "Pronto para próximo merge."

rm -f /tmp/validate-$$.log
exit 0
