#!/bin/bash
# guided-integration.sh - Integração guiada de TODAS as branches
# Processa uma a uma, com instruções claras para resolver conflitos

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

LOG=".guided-integration-$(date +%Y%m%d-%H%M%S).log"
SUCCESS=".guided-success.txt"
FAILED=".guided-failed.txt"

echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG"
echo "🚀 INTEGRAÇÃO GUIADA - 143 BRANCHES" | tee -a "$LOG"
echo "Início: $(date)" | tee -a "$LOG"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# Preparar develop
git checkout develop 2>&1 | tee -a "$LOG"
git pull origin develop 2>&1 | tee -a "$LOG" || true

SUCCESS_COUNT=0
FAILED_COUNT=0
TOTAL=0

process_branch() {
    local BRANCH=$1
    local NUM=$2
    
    echo "" | tee -a "$LOG"
    echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG"
    echo "[$NUM/143] INTEGRANDO: $BRANCH" | tee -a "$LOG"
    echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG"
    
    # Verificar se já está mergeada
    if git branch -r --merged develop 2>/dev/null | grep -q "origin/$BRANCH"; then
        echo "✅ Já mergeada anteriormente" | tee -a "$LOG"
        return 0
    fi
    
    # Tentar merge
    echo "🔄 Executando merge..." | tee -a "$LOG"
    
    if git merge "origin/$BRANCH" --no-ff -m "merge: integrate $BRANCH" 2>/tmp/guided-merge.log; then
        echo "✅ Merge limpo! Sem conflitos." | tee -a "$LOG"
        echo "$BRANCH" >> "$SUCCESS"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        return 0
    fi
    
    # Se falhou, mostrar conflitos
    echo "⚠️  Conflitos detectados!" | tee -a "$LOG"
    echo "" | tee -a "$LOG"
    
    CONFLICTS=$(git diff --name-only --diff-filter=U)
    CONFLICT_COUNT=$(echo "$CONFLICTS" | grep -v "^$" | wc -l)
    
    echo "📁 Arquivos em conflito ($CONFLICT_COUNT):" | tee -a "$LOG"
    echo "$CONFLICTS" | sed 's/^/  - /' | tee -a "$LOG"
    echo "" | tee -a "$LOG"
    
    # Estratégia 1: Resolver configs automaticamente
    echo "🛠️  Tentando auto-resolução..." | tee -a "$LOG"
    
    # CHANGELOG
    if echo "$CONFLICTS" | grep -q "CHANGELOG.md"; then
        git checkout --theirs CHANGELOG.md 2>/dev/null
        git add CHANGELOG.md 2>/dev/null
        echo "  ✓ CHANGELOG.md resolvido (theirs)" | tee -a "$LOG"
    fi
    
    # Package files
    if echo "$CONFLICTS" | grep -q "package.json"; then
        git checkout --theirs package.json pnpm-lock.yaml 2>/dev/null
        git add package.json pnpm-lock.yaml 2>/dev/null
        echo "  ✓ package.json/pnpm-lock.yaml resolvidos (theirs)" | tee -a "$LOG"
    fi
    
    # Verificar se resolveu
    REMAINING=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
    
    if [ "$REMAINING" -eq 0 ]; then
        git commit -m "merge: integrate $BRANCH (auto-resolved)" 2>&1 | tee -a "$LOG"
        echo "✅ Todos os conflitos resolvidos automaticamente!" | tee -a "$LOG"
        echo "$BRANCH" >> "$SUCCESS"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        return 0
    fi
    
    # Se ainda há conflitos, tentar resolver TypeScript
    echo "" | tee -a "$LOG"
    echo "🔧 Resolvendo arquivos TypeScript..." | tee -a "$LOG"
    
    TS_FILES=$(git diff --name-only --diff-filter=U | grep -E '\.(ts|tsx)$' || true)
    
    for file in $TS_FILES; do
        if [ -f "$file" ]; then
            # Tentar theirs
            if git checkout --theirs "$file" 2>/dev/null; then
                git add "$file" 2>/dev/null
                echo "  ✓ $file (theirs)" | tee -a "$LOG"
            fi
        fi
    done
    
    # Verificar novamente
    REMAINING=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
    
    if [ "$REMAINING" -eq 0 ]; then
        git commit -m "merge: integrate $BRANCH (auto-resolved)" 2>&1 | tee -a "$LOG"
        echo "✅ Conflitos resolvidos!" | tee -a "$LOG"
        echo "$BRANCH" >> "$SUCCESS"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        return 0
    fi
    
    # Se ainda falhou, abortar e registrar
    echo "" | tee -a "$LOG"
    echo "❌ Ainda há $REMAINING conflitos que precisam de resolução manual:" | tee -a "$LOG"
    git diff --name-only --diff-filter=U | sed 's/^/  - /' | tee -a "$LOG"
    echo "" | tee -a "$LOG"
    echo "Registrando como falha..." | tee -a "$LOG"
    
    echo "$BRANCH:$REMAINING" >> "$FAILED"
    git merge --abort 2>/dev/null || git reset --hard HEAD
    FAILED_COUNT=$((FAILED_COUNT + 1))
    
    return 1
}

# Processar todas
while IFS= read -r BRANCH; do
    [ -z "$BRANCH" ] && continue
    TOTAL=$((TOTAL + 1))
    process_branch "$BRANCH" "$TOTAL"
    
    # Progresso a cada 5
    if [ $((TOTAL % 5)) -eq 0 ]; then
        echo "" | tee -a "$LOG"
        echo "📊 PROGRESSO: $TOTAL/143 | ✅ $SUCCESS_COUNT sucessos | ❌ $FAILED_COUNT falhas" | tee -a "$LOG"
        echo "" | tee -a "$LOG"
    fi
done < /tmp/pending-branches.txt

echo "" | tee -a "$LOG"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG"
echo "📊 RESULTADO FINAL" | tee -a "$LOG"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG"
echo "  ✅ Sucessos: $SUCCESS_COUNT" | tee -a "$LOG"
echo "  ❌ Falhas: $FAILED_COUNT" | tee -a "$LOG"
echo "  📦 Total: $TOTAL" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# Build final
echo "🔨 Validando build..." | tee -a "$LOG"
if pnpm build >/tmp/guided-build.log 2>&1; then
    echo "  ✅ BUILD PASSOU!" | tee -a "$LOG"
else
    echo "  ❌ Build falhou (ver /tmp/guided-build.log)" | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "Fim: $(date)" | tee -a "$LOG"
echo "Log: $LOG" | tee -a "$LOG"
