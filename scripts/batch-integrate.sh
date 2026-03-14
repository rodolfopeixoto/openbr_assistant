#!/bin/bash
# batch-integrate.sh - Integra branches em lotes
# Uso: ./batch-integrate.sh [inicio] [fim]

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

INICIO=${1:-1}
FIM=${2:-143}

LOG=".integration-batch-$(date +%Y%m%d-%H%M%S).log"
SUCCESS=".batch-success.txt"
FAILED=".batch-failed.txt"

echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG"
echo "🚀 INTEGRAÇÃO EM LOTE: Branches $INICIO a $FIM" | tee -a "$LOG"
echo "Início: $(date)" | tee -a "$LOG"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG"

# Garantir develop atualizada
git checkout develop 2>&1 | tee -a "$LOG"
git pull origin develop 2>&1 | tee -a "$LOG" || true

# Contadores
SUCCESS_COUNT=0
FAILED_COUNT=0
TOTAL=0

# Processar lote
awk "NR>=$INICIO && NR<=$FIM" /tmp/pending-branches.txt | while read BRANCH; do
    TOTAL=$((TOTAL + 1))
    NUM=$((INICIO + TOTAL - 1))
    
    echo "" | tee -a "$LOG"
    echo "[$NUM/$FIM] $BRANCH" | tee -a "$LOG"
    echo "----------------------------------------" | tee -a "$LOG"
    
    # Verificar se já está mergeada
    if git branch -r --merged develop 2>/dev/null | grep -q "origin/$BRANCH"; then
        echo "  ⏭️  Já mergeada" | tee -a "$LOG"
        continue
    fi
    
    # Tentar merge
    if git merge "origin/$BRANCH" --no-ff -m "merge: integrate $BRANCH" 2>/tmp/merge.log; then
        echo "  ✅ Merge limpo" | tee -a "$LOG"
        echo "$BRANCH" >> "$SUCCESS"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        # Tentar resolver conflitos
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml docker-compose.yml 2>/dev/null || true
        
        # Verificar se resolveu
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            git commit -m "merge: integrate $BRANCH (auto)" 2>&1 | tee -a "$LOG"
            echo "  ✅ Auto-resolvido" | tee -a "$LOG"
            echo "$BRANCH" >> "$SUCCESS"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo "  ❌ Falhou ($CONFLICTS conflitos)" | tee -a "$LOG"
            echo "$BRANCH" >> "$FAILED"
            git merge --abort 2>/dev/null || git reset --hard HEAD
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    fi
    
    # Progresso
    if [ $((TOTAL % 5)) -eq 0 ]; then
        echo "" | tee -a "$LOG"
        echo "📈 Progresso: $TOTAL processadas | $SUCCESS_COUNT sucessos | $FAILED_COUNT falhas" | tee -a "$LOG"
        echo "" | tee -a "$LOG"
    fi
done

echo "" | tee -a "$LOG"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG"
echo "📊 RESULTADO DO LOTE" | tee -a "$LOG"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG"
echo "  Sucessos: $SUCCESS_COUNT" | tee -a "$LOG"
echo "  Falhas: $FAILED_COUNT" | tee -a "$LOG"
echo "  Total: $TOTAL" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# Build
echo "🔨 Validando build..." | tee -a "$LOG"
if pnpm build >/tmp/build-batch.log 2>&1; then
    echo "  ✅ PASSOU!" | tee -a "$LOG"
else
    echo "  ❌ Falhou" | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "Fim: $(date)" | tee -a "$LOG"
echo "Log: $LOG" | tee -a "$LOG"
echo "Sucessos: $SUCCESS" | tee -a "$LOG"
echo "Falhas: $FAILED" | tee -a "$LOG"
