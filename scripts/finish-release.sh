#!/bin/bash
# finish-release.sh - Completa o processo de release

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

echo "🚀 FINALIZANDO RELEASE v2026.3.7"
echo "================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}$1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# Verificar branch atual
CURRENT=$(git branch --show-current)
if [ "$CURRENT" != "develop" ]; then
    warn "Você não está na branch develop!"
    warn "Atual: $CURRENT"
    read -p "Mudar para develop? (s/n): " change
    if [ "$change" = "s" ]; then
        git checkout develop
    else
        error "Abortando. Execute da branch develop."
        exit 1
    fi
fi

# 1. Verificar build
log "1. Verificando build..."
if pnpm build > /tmp/final-build.log 2>&1; then
    success "Build passou!"
else
    error "Build falhou!"
    cat /tmp/final-build.log | tail -20
    exit 1
fi

# 2. Testes (opcional)
log ""
log "2. Deseja executar testes? (pode levar alguns minutos)"
read -p "Executar testes? (s/n): " tests
if [ "$tests" = "s" ]; then
    log "Executando testes..."
    if pnpm test > /tmp/tests.log 2>&1; then
        success "Testes passaram!"
    else
        warn "Alguns testes falharam (ver /tmp/tests.log)"
        read -p "Continuar mesmo assim? (s/n): " continue
        [ "$continue" != "s" ] && exit 1
    fi
fi

# 3. Push para origin
log ""
log "3. Push da develop para origin..."
read -p "Fazer push? (s/n): " push
if [ "$push" = "s" ]; then
    if git push origin develop; then
        success "Push concluído!"
    else
        error "Falha no push"
        exit 1
    fi
fi

# 4. Merge para main
log ""
log "4. Merge para main..."
read -p "Fazer merge para main? (s/n): " merge_main
if [ "$merge_main" = "s" ]; then
    git checkout main
    git pull origin main
    if git merge develop --no-ff -m "release: v2026.3.7 - Consolidation complete"; then
        success "Merge para main concluído!"
        
        read -p "Push do main? (s/n): " push_main
        if [ "$push_main" = "s" ]; then
            git push origin main
            success "Main atualizado!"
        fi
    else
        error "Merge falhou!"
        git merge --abort
        exit 1
    fi
fi

# 5. Tag de release
log ""
log "5. Criar tag de release..."
read -p "Criar tag v2026.3.7? (s/n): " tag
if [ "$tag" = "s" ]; then
    git tag -a v2026.3.7 -m "Release v2026.3.7

- Consolidation of 182 branches
- Security fixes integrated
- Version bump from 2026.1.30 to 2026.3.7
- Build passing

See CONSOLIDATION_COMPLETE.md for details."
    
    read -p "Push da tag? (s/n): " push_tag
    if [ "$push_tag" = "s" ]; then
        git push origin v2026.3.7
        success "Tag v2026.3.7 criada e enviada!"
    fi
fi

# 6. Resumo final
log ""
echo "================================="
echo "🎉 RELEASE v2026.3.7 COMPLETO!"
echo "================================="
echo ""
echo "✅ Branches consolidadas na develop"
echo "✅ Versão: 2026.3.7"
echo "✅ Build: Passando"
echo ""
echo "Branches ativas:"
git branch -v | grep -E "(main|develop)" | head -5
echo ""
echo "Tags:"
git tag -l "v2026.3.7"
echo ""
echo "🚀 Projeto consolidado e pronto!"
