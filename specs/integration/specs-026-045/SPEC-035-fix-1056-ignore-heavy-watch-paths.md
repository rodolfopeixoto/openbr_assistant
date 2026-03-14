# SPEC-035: fix/1056-ignore-heavy-watch-paths

## Informações
- **Branch:** fix/1056-ignore-heavy-watch-paths
- **Spec:** SPEC-035
- **Status:** ⏳ Pendente
- **Prioridade:** 🟡 Média

## Análise
### Tipo
Fix

### Arquivos Modificados
```
 .agent/workflows/update_clawdbot.md                |   380 -
 .branches-all.txt                                  |   175 -
 .branches-batch-aa                                 |    44 -
 .branches-batch-ab                                 |    44 -
 .branches-batch-ac                                 |    44 -
 .branches-batch-ad                                 |    43 -
 .branches-to-merge.txt                             |   175 -
 .detect-secrets.cfg                                |     4 -
 .env.example                                       |    82 +-
 .env.example.original                              |     5 -
 .github/FUNDING.yml                                |     1 -
 .github/ISSUE_TEMPLATE/bug_report.md               |     6 -
 .github/ISSUE_TEMPLATE/feature_request.md          |     4 -
 .github/actionlint.yaml                            |    17 -
 .github/dependabot.yml                             |   113 -
 .github/labeler.yml                                |   222 -
 .github/workflows/auto-response.yml                |   115 -
 .github/workflows/ci.yml                           |   114 +-
 .github/workflows/desktop-build.yml                |   140 -
 .github/workflows/docker-release.yml               |   143 -
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
git merge origin/fix/1056-ignore-heavy-watch-paths --no-ff -m "merge: integrate fix/1056-ignore-heavy-watch-paths"
# Resolver conflitos se necessário
pnpm build
git commit -m "merge: integrate fix/1056-ignore-heavy-watch-paths (resolved)"
```
