#!/bin/bash
# coordinator.sh - Agente Coordenador para Merge de Branches

set -e

INTEGRATION_BRANCH="integration/mainline-$(date +%Y%m%d-%H%M%S)"
BASE_BRANCH="origin/develop"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR/.."

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[COORDENADOR]${NC} $1"; }
log_success() { echo -e "${GREEN}[COORDENADOR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[COORDENADOR]${NC} $1"; }
log_error() { echo -e "${RED}[COORDENADOR]${NC} $1"; }

echo "=========================================="
echo "👑 AGENTE COORDENADOR - MERGE MASTER"
echo "=========================================="
echo "Data: $(date)"
echo "Branch de integração: $INTEGRATION_BRANCH"
echo "Branch base: $BASE_BRANCH"
echo ""

# Criar branch de integração
log_info "Criando branch de integração..."
git checkout -b "$INTEGRATION_BRANCH" "$BASE_BRANCH" 2>/dev/null || {
    log_warn "Branch já existe, usando a existente"
    git checkout "$INTEGRATION_BRANCH"
}

# Função para gerar lista de branches
generate_branch_list() {
    local type=$1
    local output_file=$2
    
    case "$type" in
        "security")
            git branch -r | grep "origin/fix/" | grep -E "(sandbox|traversal|lfi|security)" | sed 's/^[[:space:]]*origin\///' > "$output_file"
            ;;
        "features-core")
            git branch -r | grep "origin/feat/" | grep -E "(chat|ux|config|antigravity)" | sed 's/^[[:space:]]*origin\///' > "$output_file"
            ;;
        "features-advanced")
            git branch -r | grep "origin/feat/" | grep -v -E "(chat|ux|config|antigravity)" | sed 's/^[[:space:]]*origin\///' > "$output_file"
            ;;
        "fixes")
            git branch -r | grep "origin/fix/" | grep -v -E "(sandbox|traversal|lfi|security)" | sed 's/^[[:space:]]*origin\///' > "$output_file"
            ;;
        "modern")
            echo "modern/develop" > "$output_file"
            ;;
    esac
    
    # Remover linhas vazias
    sed -i.bak '/^[[:space:]]*$/d' "$output_file" 2>/dev/null || true
    rm -f "${output_file}.bak"
}

# Processar cada lote
LOTES=(
    "01-security-fixes:security:CRÍTICO"
    "02-features-core:features-core:ALTO"
    "03-features-advanced:features-advanced:MÉDIO"
    "04-fixes-estabilidade:fixes:MÉDIO"
    "05-modern-enterprise:modern:BAIXO"
)

TOTAL_LOTES=${#LOTES[@]}
LOTE_ATUAL=0
LOTES_SUCESSO=0
LOTES_FALHA=0

for lote in "${LOTES[@]}"; do
    IFS=':' read -r nome tipo prioridade <<< "$lote"
    LOTE_ATUAL=$((LOTE_ATUAL + 1))
    
    echo ""
    echo "=========================================="
    echo "📦 LOTE $LOTE_ATUAL/$TOTAL_LOTES: $nome"
    echo "   Prioridade: $prioridade"
    echo "=========================================="
    
    # Gerar lista de branches
    ARQUIVO="branches-${nome}.txt"
    log_info "Gerando lista de branches..."
    generate_branch_list "$tipo" "$ARQUIVO"
    
    # Contar branches
    TOTAL_BRANCHES=$(grep -v "^[[:space:]]*$" "$ARQUIVO" 2>/dev/null | wc -l)
    
    if [ "$TOTAL_BRANCHES" -eq 0 ]; then
        log_warn "Lote $nome vazio, pulando..."
        continue
    fi
    
    log_info "Processando $TOTAL_BRANCHES branches..."
    
    # Executar merge em lote
    if ./scripts/merge-batch.sh "$nome" "$ARQUIVO" "$BASE_BRANCH"; then
        log_success "✅ Lote $nome concluído!"
        LOTES_SUCESSO=$((LOTES_SUCESSO + 1))
        
        # Integrar na mainline
        WORK_BRANCH=$(git branch | grep "work/batch-.*-$nome" | tail -1 | sed 's/[[:space:]]//g')
        if [ -n "$WORK_BRANCH" ]; then
            log_info "Integrando $nome na mainline..."
            git checkout "$INTEGRATION_BRANCH"
            if git merge "$WORK_BRANCH" --no-ff -m "integrate($nome): merge batch into mainline" 2>> /tmp/coordinator-$$.log; then
                log_success "✅ Lote $nome integrado!"
            else
                log_error "❌ Merge na integration falhou para $nome"
                log_warn "Verifique: $WORK_BRANCH → $INTEGRATION_BRANCH"
            fi
        fi
    else
        log_error "❌ Lote $nome falhou!"
        LOTES_FALHA=$((LOTES_FALHA + 1))
        
        read -p "Continuar com próximo lote? (s/n): " continuar
        if [ "$continuar" != "s" ]; then
            log_warn "Coordenador pausado"
            exit 1
        fi
    fi
done

echo ""
echo "=========================================="
echo "📊 RESUMO FINAL DA INTEGRAÇÃO"
echo "=========================================="
log_success "Lotes bem-sucedidos: $LOTES_SUCESSO"
if [ $LOTES_FALHA -gt 0 ]; then
    log_error "Lotes com falha: $LOTES_FALHA"
fi
echo "Total de lotes: $TOTAL_LOTES"
echo ""

if [ $LOTES_FALHA -eq 0 ]; then
    log_success "🎉 TODOS OS LOTES INTEGRADOS COM SUCESSO!"
    echo ""
    echo "Branch de integração: $INTEGRATION_BRANCH"
    echo ""
    echo "Próximos passos:"
    echo "  1. Validação final: ./scripts/validate-merge.sh"
    echo "  2. Criar PR para develop"
    echo "  3. Após aprovação na develop: merge develop → main"
    echo "  4. Deletar branches antigas (exceto main/develop)"
    echo ""
    
    # Validação final
    log_info "Executando validação final..."
    if ./scripts/validate-merge.sh 2>> /tmp/coordinator-$$.log; then
        log_success "✅ VALIDAÇÃO FINAL PASSOU!"
        echo ""
        echo "🚀 Pronto para criar PR para develop!"
    else
        log_error "❌ Validação final falhou - verificar logs"
    fi
else
    log_warn "⚠️  Alguns lotes falharam - revisar antes de prosseguir"
    echo "Branch atual: $(git branch --show-current)"
fi

rm -f /tmp/coordinator-$$.log
