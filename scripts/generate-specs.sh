#!/bin/bash
# generate-specs.sh - Gera specs para todas as branches pendentes

cd /Users/ropeixoto/Project/rogpe.tech/rogpe_claw/rogpe_claw

COUNTER=1

while IFS= read -r BRANCH; do
    [ -z "$BRANCH" ] && continue
    
    # Determinar diretório
    if [ $COUNTER -le 10 ]; then
        DIR="specs/integration/specs-001-010"
    elif [ $COUNTER -le 25 ]; then
        DIR="specs/integration/specs-011-025"
    elif [ $COUNTER -le 45 ]; then
        DIR="specs/integration/specs-026-045"
    elif [ $COUNTER -le 60 ]; then
        DIR="specs/integration/specs-046-060"
    elif [ $COUNTER -le 80 ]; then
        DIR="specs/integration/specs-061-080"
    elif [ $COUNTER -le 100 ]; then
        DIR="specs/integration/specs-081-100"
    elif [ $COUNTER -le 120 ]; then
        DIR="specs/integration/specs-101-120"
    else
        DIR="specs/integration/specs-121-143"
    fi
    
    SPEC_FILE="$DIR/SPEC-$(printf '%03d' $COUNTER)-$(echo $BRANCH | tr '/' '-').md"
    
    # Criar spec
    cat > "$SPEC_FILE" << EOF
# SPEC-$(printf '%03d' $COUNTER): $BRANCH

## Informações
- **Branch:** $BRANCH
- **Spec:** SPEC-$(printf '%03d' $COUNTER)
- **Status:** ⏳ Pendente
- **Prioridade:** $(if [ $COUNTER -le 10 ]; then echo "🔴 Alta"; elif [ $COUNTER -le 45 ]; then echo "🟡 Média"; else echo "⚪ Baixa"; fi)

## Análise
### Tipo
$(echo $BRANCH | grep -q "^feat/" && echo "Feature" || echo "Fix")

### Arquivos Modificados
\`\`\`
$(git diff --stat origin/develop origin/$BRANCH 2>/dev/null | head -20 || echo "A analisar...")
\`\`\`

## Checklist
- [ ] Merge executado
- [ ] Conflitos resolvidos
- [ ] Sem marcadores <<<<<<< HEAD
- [ ] Build passando
- [ ] Committed

## Log
### Tentativa 1
- Data: $(date +%Y-%m-%d)
- Resultado: 
- Notas:

## Conflitos Esperados
- [ ] CHANGELOG.md
- [ ] package.json
- [ ] pnpm-lock.yaml
- [ ] Arquivos TypeScript

## Solução
\`\`\`bash
# Comandos para integrar esta branch
git checkout develop
git merge origin/$BRANCH --no-ff -m "merge: integrate $BRANCH"
# Resolver conflitos se necessário
pnpm build
git commit -m "merge: integrate $BRANCH (resolved)"
\`\`\`
EOF

    echo "Criado: $SPEC_FILE"
    COUNTER=$((COUNTER + 1))
done < .all-pending-branches.txt

echo ""
echo "✅ $((COUNTER - 1)) specs criados!"
