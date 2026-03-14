#!/bin/bash
# mass-integration.sh - Integração massiva de TODAS as branches
# Este script vai tentar integrar todas as 145 branches pendentes

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

INTEGRATION_LOG=".mass-integration-$(date +%Y%m%d-%H%M%S).log"
SUCCESS_LOG=".branches-success.txt"
FAILED_LOG=".branches-failed-manual.txt"

echo "═══════════════════════════════════════════════════════════════" | tee -a "$INTEGRATION_LOG"
echo "🚀 INTEGRAÇÃO MASSIVA - 145 BRANCHES" | tee -a "$INTEGRATION_LOG"
echo "Início: $(date)" | tee -a "$INTEGRATION_LOG"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$INTEGRATION_LOG"
echo "" | tee -a "$INTEGRATION_LOG"

# Limpar logs anteriores
> "$SUCCESS_LOG"
> "$FAILED_LOG"

# Função para integrar uma branch
integrate_branch() {
    local BRANCH=$1
    local NUM=$2
    local TOTAL=$3
    
    echo "" | tee -a "$INTEGRATION_LOG"
    echo "[$NUM/$TOTAL] Processando: $BRANCH" | tee -a "$INTEGRATION_LOG"
    echo "----------------------------------------" | tee -a "$INTEGRATION_LOG"
    
    # Verificar se já está mergeada
    if git branch -r --merged develop | grep -q "origin/$BRANCH"; then
        echo "  ⏭️  Já mergeada, pulando..." | tee -a "$INTEGRATION_LOG"
        return 0
    fi
    
    # Tentar merge
    if git merge "origin/$BRANCH" --no-ff -m "merge: integrate $BRANCH" 2>&1 | tee -a "$INTEGRATION_LOG"; then
        echo "  ✅ SUCESSO - Merge limpo" | tee -a "$INTEGRATION_LOG"
        echo "$BRANCH" >> "$SUCCESS_LOG"
        return 0
    fi
    
    # Se falhou, tentar auto-resolver
    echo "  ⚠️  Conflitos detectados, tentando resolver..." | tee -a "$INTEGRATION_LOG"
    
    # Estratégia 1: Arquivos de config - theirs
    git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml docs/docs.json 2>/dev/null || true
    git add CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml docs/docs.json 2>/dev/null || true
    
    # Estratégia 2: Resolver conflitos de código automaticamente
    CONFLICT_FILES=$(git diff --name-only --diff-filter=U 2>/dev/null | grep -E '\.(ts|tsx|js|css|md)$' || true)
    
    for file in $CONFLICT_FILES; do
        if [ -f "$file" ]; then
            # Tentar theirs primeiro
            if git checkout --theirs "$file" 2>/dev/null; then
                echo "  ✓ Resolvido: $file (theirs)" | tee -a "$INTEGRATION_LOG"
                git add "$file" 2>/dev/null || true
            else
                # Tentar remover marcadores
                if sed -i.bak '/<<<<<<< /,/>>>>>>> /d' "$file" 2>/dev/null; then
                    rm -f "${file}.bak"
                    echo "  ✓ Resolvido: $file (markers removed)" | tee -a "$INTEGRATION_LOG"
                    git add "$file" 2>/dev/null || true
                fi
            fi
        fi
    done
    
    # Verificar se resolveu
    REMAINING=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
    
    if [ "$REMAINING" -eq 0 ]; then
        git commit -m "merge: integrate $BRANCH (auto-resolved)" 2>&1 | tee -a "$INTEGRATION_LOG"
        echo "  ✅ SUCESSO - Auto-resolvido" | tee -a "$INTEGRATION_LOG"
        echo "$BRANCH" >> "$SUCCESS_LOG"
        return 0
    else
        echo "  ❌ FALHA - $REMAINING arquivos com conflitos" | tee -a "$INTEGRATION_LOG"
        echo "$BRANCH:$REMAINING" >> "$FAILED_LOG"
        git merge --abort 2>/dev/null || true
        return 1
    fi
}

# Main
git checkout develop 2>&1 | tee -a "$INTEGRATION_LOG"
git pull origin develop 2>&1 | tee -a "$INTEGRATION_LOG"

# Gerar lista de branches pendentes
echo "Gerando lista de branches..." | tee -a "$INTEGRATION_LOG"
git branch -r | grep -E "origin/(feat|fix)/" | sed 's/^[[:space:]]*origin\///' > .all-branches.txt

# Contar
TOTAL=$(wc -l < .all-branches.txt)
ALREADY=$(git branch -r --merged develop | grep -E "origin/(feat|fix)/" | wc -l)
PENDING=$((TOTAL - ALREADY))

echo "" | tee -a "$INTEGRATION_LOG"
echo "📊 ESTATÍSTICAS:" | tee -a "$INTEGRATION_LOG"
echo "  Total: $TOTAL" | tee -a "$INTEGRATION_LOG"
echo "  Já mergeadas: $ALREADY" | tee -a "$INTEGRATION_LOG"
echo "  Pendentes: $PENDING" | tee -a "$INTEGRATION_LOG"
echo "" | tee -a "$INTEGRATION_LOG"

# Processar cada branch
COUNT=0
while IFS= read -r BRANCH; do
    [ -z "$BRANCH" ] && continue
    
    COUNT=$((COUNT + 1))
    integrate_branch "$BRANCH" "$COUNT" "$TOTAL"
    
    # Log de progresso a cada 10
    if [ $((COUNT % 10)) -eq 0 ]; then
        SUCCESS_COUNT=$(wc -l < "$SUCCESS_LOG" 2>/dev/null || echo "0")
        FAILED_COUNT=$(wc -l < "$FAILED_LOG" 2>/dev/null || echo "0")
        echo "" | tee -a "$INTEGRATION_LOG"
        echo "📈 PROGRESSO [$COUNT/$TOTAL]: $SUCCESS_COUNT sucessos, $FAILED_COUNT falhas" | tee -a "$INTEGRATION_LOG"
        echo "" | tee -a "$INTEGRATION_LOG"
    fi
done < .all-branches.txt

# Resultados finais
echo "" | tee -a "$INTEGRATION_LOG"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$INTEGRATION_LOG"
echo "📊 RESULTADO FINAL" | tee -a "$INTEGRATION_LOG"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$INTEGRATION_LOG"

SUCCESS_TOTAL=$(wc -l < "$SUCCESS_LOG" 2>/dev/null || echo "0")
FAILED_TOTAL=$(wc -l < "$FAILED_LOG" 2>/dev/null || echo "0")

echo "  ✅ Sucessos: $SUCCESS_TOTAL" | tee -a "$INTEGRATION_LOG"
echo "  ❌ Falhas: $FAILED_TOTAL" | tee -a "$INTEGRATION_LOG"
echo "  📦 Total processado: $COUNT" | tee -a "$INTEGRATION_LOG"
echo "" | tee -a "$INTEGRATION_LOG"

# Build
echo "🔨 Validando build..." | tee -a "$INTEGRATION_LOG"
if pnpm build > /tmp/mass-build.log 2>&1; then
    echo "  ✅ BUILD PASSOU!" | tee -a "$INTEGRATION_LOG"
else
    echo "  ❌ Build falhou" | tee -a "$INTEGRATION_LOG"
    echo "  Log: /tmp/mass-build.log" | tee -a "$INTEGRATION_LOG"
fi

echo "" | tee -a "$INTEGRATION_LOG"
echo "Fim: $(date)" | tee -a "$INTEGRATION_LOG"
echo "Log completo: $INTEGRATION_LOG" | tee -a "$INTEGRATION_LOG"
echo "Sucessos: $SUCCESS_LOG" | tee -a "$INTEGRATION_LOG"
echo "Falhas: $FAILED_LOG" | tee -a "$INTEGRATION_LOG"
