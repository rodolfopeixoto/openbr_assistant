#!/bin/bash
# assign-agent.sh - Assign an agent to a feature

set -e

if [ $# -lt 2 ]; then
    echo "Usage: ./scripts/assign-agent.sh <AGENT_NAME> <FEATURE>"
    echo ""
    echo "Example:"
    echo "  ./scripts/assign-agent.sh AgenteA SEC-001-remove-default-secret"
    exit 1
fi

AGENT=$1
FEATURE=$2
WORKTREE_BASE="../openbr-worktrees"
WT_PATH="$WORKTREE_BASE/$FEATURE"

if [ ! -d "$WT_PATH" ]; then
    echo "❌ Worktree não encontrado: $FEATURE"
    echo "Execute primeiro: ./scripts/setup-worktrees.sh"
    exit 1
fi

# Atualizar assignee
echo "$AGENT" > "$WT_PATH/.agent-assignee"
echo "IN_PROGRESS" > "$WT_PATH/.agent-status"

# Criar arquivo de tarefas
cat > "$WT_PATH/.agent-tasks.md" << EOF
# 🎯 Tarefas para $AGENT - $FEATURE

## Responsabilidades
- Implementar feature completa segundo spec
- Escrever testes unitários (>80% coverage)
- Garantir que não haja conflitos com outras features
- Documentar mudanças no CHANGELOG.md

## Checklist
- [ ] Código implementado
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Documentação
- [ ] Code review solicitado
- [ ] Merge aprovado

## Comunicação
- Status updates: 3x por dia (9h, 13h, 18h)
- Bloqueios: Reportar imediatamente
- Dúvidas: #sec-team no Slack

## Spec
Ver: docs/SECURITY_SPECS.md#$FEATURE
EOF

echo "✅ $AGENT assignado a $FEATURE"
echo ""
echo "Worktree: $WT_PATH"
echo "Status: IN_PROGRESS"
echo ""
echo "Para começar:"
echo "  cd $WT_PATH"
echo "  code ."
echo ""
echo "Para atualizar status:"
echo "  echo 'DONE' > $WT_PATH/.agent-status"
