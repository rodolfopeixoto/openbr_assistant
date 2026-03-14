#!/bin/bash
# mass-integration-v2.sh - Versão corrigida para integração massiva

set -e

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

LOG_FILE=".mass-integration-v2-$(date +%Y%m%d-%H%M%S).log"
SUCCESS_FILE=".mass-success-v2.txt"
FAILED_FILE=".mass-failed-v2.txt"

echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "🚀 INTEGRAÇÃO MASSIVA V2 - 145 BRANCHES" | tee -a "$LOG_FILE"
echo "Início: $(date)" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"

# Limpar
> "$SUCCESS_FILE"
> "$FAILED_FILE"

# Garantir que estamos na develop
git checkout develop 2>&1 | tee -a "$LOG_FILE"

# Gerar lista
if [ ! -f .all-branches.txt ]; then
    git branch -r | grep -E "origin/(feat|fix)/" | sed 's/^[[:space:]]*origin\///' > .all-branches.txt
fi

TOTAL=$(wc -l < .all-branches.txt)
ALREADY=$(git branch -r --merged develop 2>/dev/null | grep -E "origin/(feat|fix)/" | wc -l)

echo "" | tee -a "$LOG_FILE"
echo "📊 Total: $TOTAL | Já mergeadas: $ALREADY | Pendentes: $((TOTAL - ALREADY))" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

SUCCESS=0
FAILED=0
COUNT=0

while IFS= read -r BRANCH; do
    [ -z "$BRANCH" ] && continue
    
    COUNT=$((COUNT + 1))
    
    # Verificar se já está mergeada
    if git branch -r --merged develop 2>/dev/null | grep -q "origin/$BRANCH"; then
        echo "[$COUNT/$TOTAL] $BRANCH - ⏭️ Já mergeada" | tee -a "$LOG_FILE"
        continue
    fi
    
    echo "[$COUNT/$TOTAL] $BRANCH - Processando..." | tee -a "$LOG_FILE"
    
    # Tentar merge
    if git merge "origin/$BRANCH" --no-ff -m "merge: integrate $BRANCH" 2>/tmp/merge-$COUNT.log; then
        echo "  ✅ Merge limpo" | tee -a "$LOG_FILE"
        echo "$BRANCH" >> "$SUCCESS_FILE"
        SUCCESS=$((SUCCESS + 1))
    else
        # Tentar auto-resolver
        git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        git add CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
        
        # Verificar conflitos restantes
        CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
        
        if [ "$CONFLICTS" -eq 0 ]; then
            git commit -m "merge: integrate $BRANCH (auto-resolved)" 2>&1 | tee -a "$LOG_FILE"
            echo "  ✅ Auto-resolvido" | tee -a "$LOG_FILE"
            echo "$BRANCH" >> "$SUCCESS_FILE"
            SUCCESS=$((SUCCESS + 1))
        else
            echo "  ❌ Falhou ($CONFLICTS conflitos)" | tee -a "$LOG_FILE"
            echo "$BRANCH:$CONFLICTS" >> "$FAILED_FILE"
            git merge --abort 2>/dev/null || git reset --hard HEAD
            FAILED=$((FAILED + 1))
        fi
    fi
    
    # Progresso a cada 10
    if [ $((COUNT % 10)) -eq 0 ]; then
        echo "" | tee -a "$LOG_FILE"
        echo "📈 PROGRESSO: $COUNT processadas | $SUCCESS sucessos | $FAILED falhas" | tee -a "$LOG_FILE"
        echo "" | tee -a "$LOG_FILE"
    fi
done < .all-branches.txt

echo "" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "📊 RESULTADO FINAL" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "  ✅ Sucessos: $SUCCESS" | tee -a "$LOG_FILE"
echo "  ❌ Falhas: $FAILED" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Build
echo "🔨 Build..." | tee -a "$LOG_FILE"
if pnpm build >/tmp/mass-build.log 2>&1; then
    echo "  ✅ PASSOU!" | tee -a "$LOG_FILE"
else
    echo "  ❌ Falhou (ver /tmp/mass-build.log)" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "Fim: $(date)" | tee -a "$LOG_FILE"
echo "Log: $LOG_FILE" | tee -a "$LOG_FILE"
