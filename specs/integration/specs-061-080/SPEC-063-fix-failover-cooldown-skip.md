# SPEC-063: fix/failover-cooldown-skip

## Informações
- **Branch:** fix/failover-cooldown-skip
- **Spec:** SPEC-063
- **Status:** ⏳ Pendente
- **Prioridade:** ⚪ Baixa

## Análise
### Tipo
Fix

### Arquivos Modificados
```
 .agent/workflows/update_clawdbot.md                |    26 +-
 .branches-all.txt                                  |   175 -
 .branches-batch-aa                                 |    44 -
 .branches-batch-ab                                 |    44 -
 .branches-batch-ac                                 |    44 -
 .branches-batch-ad                                 |    43 -
 .branches-to-merge.txt                             |   175 -
 .env.example                                       |    82 +-
 .env.example.original                              |     5 -
 .github/FUNDING.yml                                |     2 +-
 .github/ISSUE_TEMPLATE/bug_report.md               |     6 -
 .github/ISSUE_TEMPLATE/feature_request.md          |     4 -
 .github/actionlint.yaml                            |     2 +-
 .github/dependabot.yml                             |     4 +-
 .github/workflows/auto-response.yml                |    66 +-
 .github/workflows/ci.yml                           |    24 +-
 .github/workflows/desktop-build.yml                |   140 -
 .github/workflows/formal-conformance.yml           |   124 -
 .github/workflows/install-smoke.yml                |     6 +-
 .github/workflows/labeler.yml                      |    11 +-
```

## Checklist
- [ ] Merge executado
- [ ] Conflitos resolvidos
- [ ] Sem marcadores <<<<<<< HEAD
- [ ] Build passando
- [ ] Committed

## Log
### Tentativa 1
- Data: 2026-03-14
- Resultado: 
- Notas:

## Conflitos Esperados
- [ ] CHANGELOG.md
- [ ] package.json
- [ ] pnpm-lock.yaml
- [ ] Arquivos TypeScript

## Solução
```bash
# Comandos para integrar esta branch
git checkout develop
git merge origin/fix/failover-cooldown-skip --no-ff -m "merge: integrate fix/failover-cooldown-skip"
# Resolver conflitos se necessário
pnpm build
git commit -m "merge: integrate fix/failover-cooldown-skip (resolved)"
```
