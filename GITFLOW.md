# Gitflow Workflow - OpenBR

## Estrutura de Branches

```
main (protegida) -----------------|
    |                             |
    |---> develop (integracao) <--|
            |
            |---> feature/* ------| (PR -> develop)
            |
            |---> hotfix/* -------| (PR -> main + develop)
            |
            |---> release/* ------| (PR -> main)
```

## Branches

### main
- **Protegida**: Sim
- **Deploy**: Producao
- **Merge**: Apenas via PR
- **Commits**: Squash merge preferido

### develop
- **Protegida**: Sim  
- **Deploy**: Staging/QA
- **Merge**: Via PR de feature branches
- **Base**: Sempre atualizada com main

### feature/*
- **Naming**: `feature/nome-descritivo`
- **Base**: develop
- **Merge**: PR para develop
- **Exemplo**: `feature/model-selector-v2`

### hotfix/*
- **Naming**: `hotfix/correcao-urgente`
- **Base**: main
- **Merge**: PR para main E develop
- **Uso**: Correcoes criticas em producao

### release/*
- **Naming**: `release/v2026.2.0`
- **Base**: develop
- **Merge**: PR para main
- **Uso**: Preparacao de releases

## Workflow Diario

### 1. Comecar nova feature
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nome-da-feature
# ... trabalhar ...
git add .
git commit -m "feat: descricao"
git push -u origin feature/nome-da-feature
# Criar PR no GitHub
```

### 2. Atualizar feature com develop
```bash
git checkout feature/nome-da-feature
git fetch origin
git rebase origin/develop
# Resolver conflitos se necessario
git push --force-with-lease
```

### 3. Hotfix urgente
```bash
git checkout main
git pull origin main
git checkout -b hotfix/correcao-critica
# ... corrigir ...
git add .
git commit -m "fix: descricao"
git push -u origin hotfix/correcao-critica
# Criar PR para main E develop
```

## Comandos Uteis

```bash
# Ver estado das branches
git branch -a

# Limpar branches locais deletadas
git fetch --prune

# Sincronizar tudo
git checkout main && git pull
git checkout develop && git pull

# Criar feature a partir de develop
git checkout develop
git checkout -b feature/nome
```

## Commits

Use Conventional Commits:

- `feat:` Nova feature
- `fix:` Correcao de bug
- `docs:` Documentacao
- `style:` Formatacao
- `refactor:` Refatoracao
- `test:` Testes
- `chore:` Tarefas

Exemplo:
```bash
git commit -m "feat(ui): add model selector component"
git commit -m "fix(api): resolve auth profile loading"
git commit -m "docs: update installation guide"
```

## Estado Atual

- **main**: Branch principal atualizada com codigo limpo
- **develop**: Branch de integracao sincronizada com main
- **feature/analytics-tools-dev**: Preservada como backup
- **main-stable**: Deletada (substituida por main)
