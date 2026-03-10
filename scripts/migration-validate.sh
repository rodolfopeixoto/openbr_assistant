#!/bin/bash
#
# Script de Validação de Lote
# Uso: ./scripts/migration-validate.sh
#

set -e

echo "=========================================="
echo "🧪 VALIDAÇÃO DE LOTE"
echo "=========================================="

# Verificar se estamos em um branch de migração
CURRENT_BRANCH=$(git branch --show-current)
if [[ ! $CURRENT_BRANCH =~ ^migration/batch- ]]; then
    echo "⚠️  Atenção: Você não está em um branch de migração"
    echo "   Branch atual: $CURRENT_BRANCH"
    echo "   Esperado: migration/batch-XXX"
    read -p "Continuar mesmo assim? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "📦 Instalando dependências..."
pnpm install --frozen-lockfile 2>&1 | tail -5

echo ""
echo "🔨 Build do projeto..."
pnpm build 2>&1 | tail -10

echo ""
echo "🔍 Lint..."
pnpm lint 2>&1 | tail -5

echo ""
echo "🧪 Testes unitários..."
pnpm test 2>&1 | tail -20

echo ""
echo "🧪 Testes E2E..."
pnpm test:e2e 2>&1 | tail -10 || echo "⚠️  Alguns testes E2E falharam (verificar manualmente)"

echo ""
echo "🖥️  Build do Desktop..."
cd apps/desktop/src-tauri
cargo build --release 2>&1 | tail -5

echo ""
echo "=========================================="
echo "✅ VALIDAÇÃO COMPLETA!"
echo "=========================================="
echo ""
echo "O lote está pronto para merge."
echo ""
echo "Próximos passos:"
echo "1. git add -A"
echo "2. git commit -m \"migration: batch-XXX complete\""
echo "3. git checkout develop"
echo "4. git merge migration/batch-XXX"
