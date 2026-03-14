#!/bin/bash
# merge-orchestrator.sh - Orquestrador mestre de merges
# Executa múltiplos agentes em paralelo de forma coordenada

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

echo -e "${WHITE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🤖 OPENCLAW - EQUIPE DE MERGE AUTOMATIZADA          ║"
echo "║              Orquestrador Mestre v1.0                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "Data: $(date)"
echo "Diretório: $(pwd)"
echo ""

# Funções de log
log_phase() {
    echo ""
    echo -e "${PURPLE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  FASE: $1${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

log_info() { echo -e "${BLUE}[ORQUESTRADOR]${NC} $1"; }
log_success() { echo -e "${GREEN}[ORQUESTRADOR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[ORQUESTRADOR]${NC} $1"; }
log_error() { echo -e "${RED}[ORQUESTRADOR]${NC} $1"; }

# Verificar pré-requisitos
log_phase "VERIFICAÇÃO DE PRÉ-REQUISITOS"

if ! command -v pnpm &> /dev/null; then
    log_error "pnpm não encontrado. Instale primeiro."
    exit 1
fi

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "Não estamos em um repositório git"
    exit 1
fi

log_success "✓ Pré-requisitos OK"

# Fetch inicial
log_info "Atualizando branches remotas..."
git fetch --all --prune

# Contar branches
TOTAL_BRANCHES=$(git branch -r | wc -l)
FEAT_BRANCHES=$(git branch -r | grep "origin/feat/" | wc -l)
FIX_BRANCHES=$(git branch -r | grep "origin/fix/" | wc -l)
SECURITY_BRANCHES=$(git branch -r | grep -E "origin/(fix|security)/" | grep -iE "(security|sandbox|auth|bypass|injection)" | wc -l)

echo ""
echo -e "${CYAN}📊 ESTADO ATUAL DO REPOSITÓRIO${NC}"
echo "--------------------------------"
echo "Total de branches remotas: $TOTAL_BRANCHES"
echo "Branches feat/*: $FEAT_BRANCHES"
echo "Branches fix/*: $FIX_BRANCHES"
echo "Branches de segurança: $SECURITY_BRANCHES"
echo ""

# FASE 1: Preparação
log_phase "FASE 1: PREPARAÇÃO"

log_info "Limpando branches de trabalho antigas..."
git branch | grep "work/agent-" | xargs -r git branch -D 2>/dev/null || true

log_info "Criando diretório de logs..."
mkdir -p .merge-logs

# FASE 2: Execução Paralela
log_phase "FASE 2: EXECUÇÃO DOS AGENTES"

# Função para executar agente
run_agent() {
    local agent_script=$1
    local agent_name=$2
    local log_file=".merge-logs/${agent_name}-$(date +%Y%m%d-%H%M%S).log"
    
    echo -e "${CYAN}▶ Iniciando $agent_name...${NC} (log: $log_file)"
    
    if ./scripts/$agent_script > "$log_file" 2>&1; then
        echo -e "${GREEN}✓ $agent_name concluído com sucesso${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $agent_name terminou com avisos${NC}"
        echo "  Ver log: $log_file"
        return 1
    fi
}

# Executar Agent-Security primeiro (CRÍTICO)
echo ""
log_info "🚀 Executando Agente de Segurança (CRÍTICO)..."
if run_agent "agent-security.sh" "Agent-Security"; then
    SECURITY_STATUS="✅ SUCESSO"
else
    SECURITY_STATUS="⚠️ PARCIAL"
fi

# Executar Agent-Features em paralelo (se security passou)
echo ""
log_info "🚀 Executando Agente de Features..."
if run_agent "agent-features.sh" "Agent-Features"; then
    FEATURES_STATUS="✅ SUCESSO"
else
    FEATURES_STATUS="⚠️ PARCIAL"
fi

# Executar Agent-Fixes
echo ""
log_info "🚀 Executando Agente de Fixes..."
if run_agent "agent-fixes.sh" "Agent-Fixes"; then
    FIXES_STATUS="✅ SUCESSO"
else
    FIXES_STATUS="⚠️ PARCIAL"
fi

# FASE 3: Integração
log_phase "FASE 3: INTEGRAÇÃO PELO COORDENADOR"

log_info "Executando coordenador para integrar resultados..."
if ./scripts/coordinator.sh; then
    COORD_STATUS="✅ SUCESSO"
else
    COORD_STATUS="⚠️ PARCIAL"
fi

# FASE 4: Resumo Final
log_phase "FASE 4: RESUMO FINAL"

echo -e "${WHITE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    RESULTADOS DA EQUIPE                     ║"
echo "╠════════════════════════════════════════════════════════════╣"
printf "║  %-25s %-25s   ║\n" "Agente" "Status"
echo "╠════════════════════════════════════════════════════════════╣"
printf "║  %-25s %-25s   ║\n" "Agent-Security" "$SECURITY_STATUS"
printf "║  %-25s %-25s   ║\n" "Agent-Features" "$FEATURES_STATUS"
printf "║  %-25s %-25s   ║\n" "Agent-Fixes" "$FIXES_STATUS"
printf "║  %-25s %-25s   ║\n" "Coordinator" "$COORD_STATUS"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se tudo passou
if [[ "$SECURITY_STATUS" == "✅ SUCESSO" && "$FEATURES_STATUS" == "✅ SUCESSO" && "$FIXES_STATUS" == "✅ SUCESSO" && "$COORD_STATUS" == "✅ SUCESSO" ]]; then
    log_success "🎉 TODOS OS AGENTES CONCLUÍRAM COM SUCESSO!"
    echo ""
    echo "Próximo passo: Revisar a branch integration/mainline"
    echo "e criar PR para develop → main"
    exit 0
else
    log_warn "⚠️  Alguns agentes tiveram problemas"
    echo ""
    echo "Verifique os logs em .merge-logs/ para detalhes"
    echo "Branches de trabalho criadas podem ser revisadas manualmente"
    exit 1
fi
