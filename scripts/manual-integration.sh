#!/bin/bash
# manual-integration.sh - Script para integração manual guiada

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

echo "═══════════════════════════════════════════════════════════════"
echo "🛠️  INTEGRAÇÃO MANUAL DE BRANCHES"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Este script vai guiar você na integração das branches restantes."
echo "Cada branch será processada individualmente com instruções claras."
echo ""
echo "ESTIMATIVA DE TEMPO: 10-20 horas para 143 branches"
echo ""
echo "Pressione ENTER para começar..."
read

# Lista de branches pendentes
git branch -r | grep "origin/" | grep -E "(feat|fix)/" | sed 's/origin\///' | while read BRANCH; do
    if ! git branch -r --merged develop | grep -q "origin/$BRANCH"; then
        echo "$BRANCH"
    fi
done > .pending.txt

TOTAL=$(wc -l < .pending.txt)
CURRENT=0

while IFS= read -r BRANCH; do
    CURRENT=$((CURRENT + 1))
    
    clear
    echo "═══════════════════════════════════════════════════════════════"
    echo "[$CURRENT/$TOTAL] INTEGRANDO: $BRANCH"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    # Mostrar o que a branch faz
    echo "📋 Últimos commits desta branch:"
    git log --oneline origin/$BRANCH | head -5 | sed 's/^/  /'
    echo ""
    
    # Tentar merge
    echo "🔄 Executando merge..."
    if git merge origin/$BRANCH --no-ff -m "merge: integrate $BRANCH" 2>/tmp/merge-manual.log; then
        echo "  ✅ Merge bem-sucedido!"
        echo ""
        echo "Pressione ENTER para próxima branch..."
        read
    else
        echo "  ⚠️  Conflitos detectados!"
        echo ""
        echo "📁 Arquivos em conflito:"
        git diff --name-only --diff-filter=U | sed 's/^/  - /'
        echo ""
        echo "Opções:"
        echo "  1) Tentar auto-resolver (recomendado para configs)"
        echo "  2) Resolver manualmente (abrir arquivos)"
        echo "  3) Pular esta branch"
        echo "  4) Abortar tudo"
        echo ""
        read -p "Escolha (1-4): " CHOICE
        
        case $CHOICE in
            1)
                echo "Tentando auto-resolver..."
                git checkout --theirs CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
                git add CHANGELOG.md package.json pnpm-lock.yaml 2>/dev/null || true
                
                CONFLICTS=$(git diff --name-only --diff-filter=U | wc -l)
                if [ $CONFLICTS -eq 0 ]; then
                    git commit -m "merge: integrate $BRANCH (auto-resolved)"
                    echo "✅ Resolvido automaticamente!"
                else
                    echo "❌ Ainda há $CONFLICTS conflitos"
                    echo "$BRANCH" >> .manual-failed.txt
                    git merge --abort
                fi
                ;;
            2)
                echo "Abrindo arquivos para resolução manual..."
                git diff --name-only --diff-filter=U
                echo ""
                echo "Após resolver, execute:"
                echo "  git add ."
                echo "  git commit -m \"merge: integrate $BRANCH\""
                echo ""
                read -p "Pressione ENTER quando terminar..."
                ;;
            3)
                echo "Pulando..."
                echo "$BRANCH" >> .manual-failed.txt
                git merge --abort 2>/dev/null || true
                ;;
            4)
                echo "Abortando..."
                git merge --abort 2>/dev/null || true
                exit 0
                ;;
        esac
        
        echo ""
        echo "Pressione ENTER para continuar..."
        read
    fi
done < .pending.txt

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ INTEGRAÇÃO CONCLUÍDA!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
if [ -f .manual-failed.txt ]; then
    echo "Branches que precisam de atenção:"
    cat .manual-failed.txt | sed 's/^/  - /'
fi
