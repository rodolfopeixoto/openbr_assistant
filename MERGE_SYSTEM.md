# 🤖 Sistema de Merge Automatizado - OpenClaw

Este sistema executa merges de múltiplas branches em paralelo, como uma equipe de desenvolvedores.

## 📋 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    ORQUESTRADOR MESTRE                       │
│              (scripts/merge-orchestrator.sh)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
│Agent-Security│ │Agent-Feat│ │  Agent-Fixes│
│  (CRÍTICO)   │ │(ALTO)    │ │  (MÉDIO)    │
└───────┬──────┘ └────┬─────┘ └──────┬──────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
              ┌────────▼────────┐
              │   COORDENADOR   │
              │(Integra tudo)   │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │integration/     │
              │mainline         │
              └─────────────────┘
```

## 🚀 Como Executar

### Opção 1: Executar Tudo (Recomendado)

```bash
./scripts/merge-orchestrator.sh
```

Isso executa:
1. **Agent-Security** - Merge das correções de segurança críticas
2. **Agent-Features** - Merge das features core
3. **Agent-Fixes** - Merge dos fixes gerais
4. **Coordenador** - Integra tudo na branch `integration/mainline`

### Opção 2: Executar Agentes Individualmente

```bash
# Agente de Segurança (prioridade máxima)
./scripts/agent-security.sh

# Agente de Features
./scripts/agent-features.sh

# Agente de Fixes
./scripts/agent-fixes.sh
```

### Opção 3: Apenas Coordenador (se agentes já rodaram)

```bash
./scripts/coordinator.sh
```

## 📁 Scripts

- **`merge-orchestrator.sh`** - Orquestrador mestre que coordena todos
- **`agent-security.sh`** - Agente especialista em segurança
- **`agent-features.sh`** - Agente especialista em features
- **`agent-fixes.sh`** - Agente especialista em fixes
- **`coordinator.sh`** - Integra resultados dos agentes
- **`merge-batch.sh`** - Merge de lotes de branches
- **`validate-merge.sh`** - Validação padrão após cada merge

## 🔒 Fluxo de Validação

Cada merge passa por:

1. ✅ **Build** - `pnpm build`
2. ✅ **Lint** - `pnpm lint`
3. ✅ **Testes Unitários** - `pnpm test:unit`
4. ✅ **Testes de Integração** - `pnpm test:integration`
5. ✅ **Scan de Secrets** - `detect-secrets`
6. ✅ **Verificação de Conflitos**

## 📊 Estratégia de Lotes

As branches são organizadas em lotes por prioridade:

| Lote | Prioridade | Branches | Descrição |
|------|------------|----------|-----------|
| 01 | CRÍTICO | fix/* security | Correções de segurança |
| 02 | ALTO | feat/* (core) | Features principais |
| 03 | MÉDIO | feat/* (advanced) | Features avançadas |
| 04 | MÉDIO | fix/* (outros) | Fixes de estabilidade |
| 05 | BAIXO | modern/develop | Enterprise/Fork |

## 🎯 Resultado Final

Ao final da execução:

1. Branch `integration/mainline-YYYYMMDD` criada com todos merges
2. Validação completa passando
3. Pronto para PR: `integration/mainline` → `develop` → `main`
4. Logs salvos em `.merge-logs/`

## 🛠️ Em Caso de Falha

Se algum merge falhar:

1. Verifique os logs: `cat .merge-logs/Agent-*.log`
2. A branch de trabalho é preservada: `work/agent-*`
3. Resolva manualmente e continue
4. Ou pule a branch problemática

## 📝 Comandos Úteis

```bash
# Ver status atual
git branch -a | grep work/agent

# Ver logs
ls -la .merge-logs/
tail -f .merge-logs/Agent-Security-*.log

# Limpar branches de trabalho
git branch | grep work/agent- | xargs git branch -D

# Ver diferenças
git diff origin/develop integration/mainline-$(date +%Y%m%d) --stat
```

## ⚠️ Atenção

- **Sempre execute primeiro em ambiente de teste**
- **Faça backup antes de começar**
- **Merges são feitos com --no-ff para preservar histórico**
- **Cada merge é validado antes de prosseguir**
