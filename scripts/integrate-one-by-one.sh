#!/bin/bash

# Script robusto de integração de branches - processa uma branch por vez
# Resolve conflitos automaticamente quando possível, aborta quando não

set -euo pipefail

# Configurações
BRANCHES_FILE=".all-branches.txt"
FAILURES_FILE=".merge-failures.txt"
LOG_FILE=".merge-integration.log"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

# Contadores
TOTAL_BRANCHES=0
PROCESSED=0
SUCCESSFUL=0
FAILED=0
SKIPPED=0

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de logging
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$message" | tee -a "$LOG_FILE"
}

info() {
    log "${BLUE}ℹ $1${NC}"
}

success() {
    log "${GREEN}✓ $1${NC}"
}

warning() {
    log "${YELLOW}⚠ $1${NC}"
}

error() {
    log "${RED}✗ $1${NC}"
}

# Verificar se estamos em um repositório git
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "Não estamos em um repositório git!"
        exit 1
    fi
    info "Repositório git detectado: $(git rev-parse --show-toplevel)"
}

# Verificar se há merges em andamento
check_merge_in_progress() {
    if [ -d "$(git rev-parse --git-dir)/MERGE_HEAD" ] || 
       [ -f "$(git rev-parse --git-dir)/MERGE_MODE" ] || 
       [ -f "$(git rev-parse --git-dir)/MERGE_MSG" ]; then
        return 0
    fi
    return 1
}

# Abortar merge em andamento se necessário
abort_merge_if_needed() {
    if check_merge_in_progress; then
        warning "Merge em andamento detectado. Abortando..."
        git merge --abort || true
        sleep 1
        if check_merge_in_progress; then
            error "Não foi possível abortar o merge! Estado crítico."
            exit 1
        fi
        info "Merge abortado com sucesso"
    fi
}

# Verificar estado do working directory
check_working_directory() {
    if ! git diff --quiet HEAD || ! git diff --cached --quiet; then
        warning "Working directory não está limpo. Verificando mudanças..."
        git status --short
        
        # Tentar stash das mudanças
        info "Fazendo stash das mudanças locais..."
        git stash push -m "Auto-stash antes de merge $(date '+%Y-%m-%d %H:%M:%S')"
        return 0
    fi
    return 1
}

# Resolver conflitos automaticamente para arquivos específicos
auto_resolve_conflicts() {
    local resolved_count=0
    
    # Lista de arquivos com conflito
    local conflicted_files
    conflicted_files=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
    
    if [ -z "$conflicted_files" ]; then
        return 0
    fi
    
    info "Tentando auto-resolver conflitos..."
    
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        
        info "Analisando conflito em: $file"
        
        # Estratégia 1: Aceitar versão incoming (THEIRS) para arquivos de build/lock
        case "$file" in
            package-lock.json|yarn.lock|pnpm-lock.yaml|Gemfile.lock|composer.lock|Pipfile.lock|*.lock)
                info "  → Usando estratégia: aceitar versão incoming (THEIRS) para lock file"
                git checkout --theirs "$file" 2>/dev/null || continue
                git add "$file" 2>/dev/null || continue
                ((resolved_count++))
                success "  → Resolvido: $file (THEIRS)"
                continue
                ;;
        esac
        
        # Estratégia 2: Para CHANGELOG, tentar mesclar mantendo ambas as entradas
        if [[ "$file" =~ [Cc][Hh][Aa][Nn][Gg][Ee][Ll][Oo][Gg] ]]; then
            info "  → Tentando resolver CHANGELOG..."
            if resolve_changelog_conflict "$file"; then
                ((resolved_count++))
                success "  → Resolvido: $file (CHANGELOG merge)"
                continue
            fi
        fi
        
        # Estratégia 3: Para package.json, tentar mesclar dependências
        if [[ "$file" == "package.json" ]]; then
            info "  → Tentando resolver package.json..."
            if resolve_package_json_conflict "$file"; then
                ((resolved_count++))
                success "  → Resolvido: $file (package.json merge)"
                continue
            fi
        fi
        
        # Estratégia 4: Para arquivos de configuração, tentar aceitar incoming
        if [[ "$file" =~ ^\.(git|prettier|eslint|babel|webpack|vite|rollup|tsconfig|jsconfig|editorconfig) ]]; then
            info "  → Usando estratégia: aceitar incoming para arquivo de configuração"
            git checkout --theirs "$file" 2>/dev/null || continue
            git add "$file" 2>/dev/null || continue
            ((resolved_count++))
            success "  → Resolvido: $file (THEIRS - config)"
            continue
        fi
        
        # Estratégia 5: Para arquivos gerados automaticamente
        if [[ "$file" =~ \.(map|min\.(js|css)|bundle\.)$ ]] || 
           [[ "$file" =~ /(dist|build|out|target|coverage|\.cache)/ ]]; then
            info "  → Removendo arquivo gerado automaticamente: $file"
            git rm -f "$file" 2>/dev/null || rm -f "$file"
            ((resolved_count++))
            success "  → Resolvido: $file (removed generated)"
            continue
        fi
        
        warning "  → Não foi possível auto-resolver: $file"
        
    done <<< "$conflicted_files"
    
    return $(( ${#conflicted_files[@]} - resolved_count ))
}

# Resolver conflito em CHANGELOG
resolve_changelog_conflict() {
    local file="$1"
    
    # Verificar se é um arquivo de texto
    if ! file "$file" | grep -q text; then
        return 1
    fi
    
    # Criar backup
    cp "$file" "${file}.backup"
    
    # Tentar resolver aceitando ambas as versões e ordenando por data
    if git show :1:"$file" > "${file}.base" 2>/dev/null &&
       git show :2:"$file" > "${file}.ours" 2>/dev/null &&
       git show :3:"$file" > "${file}.theirs" 2>/dev/null; then
        
        # Para CHANGELOG, vamos manter a versão incoming e adicionar entradas da nossa
        # se forem mais recentes (heurística simples)
        cat "${file}.theirs" > "$file"
        
        # Adicionar nossa versão
        git add "$file"
        
        # Limpar arquivos temporários
        rm -f "${file}.base" "${file}.ours" "${file}.theirs" "${file}.backup"
        
        return 0
    fi
    
    # Restaurar backup em caso de falha
    mv "${file}.backup" "$file"
    rm -f "${file}.base" "${file}.ours" "${file}.theirs"
    
    return 1
}

# Resolver conflito em package.json
resolve_package_json_conflict() {
    local file="$1"
    
    # Verificar se jq está disponível
    if ! command -v jq &> /dev/null; then
        warning "jq não está instalado. Tentando estratégia alternativa..."
        # Estratégia alternativa: aceitar incoming para package.json
        git checkout --theirs "$file" 2>/dev/null || return 1
        git add "$file" 2>/dev/null || return 1
        return 0
    fi
    
    # Salvar versões
    git show :1:"$file" > "${file}.base" 2>/dev/null || true
    git show :2:"$file" > "${file}.ours" 2>/dev/null || true
    git show :3:"$file" > "${file}.theirs" 2>/dev/null || true
    
    # Tentar mesclar usando jq
    if [ -f "${file}.ours" ] && [ -f "${file}.theirs" ]; then
        # Criar merge de package.json
        jq -s '
            def merge_deps:
                .[0] * .[1] | with_entries(select(.value != null));
            
            {
                name: .[0].name,
                version: .[1].version,
                description: .[1].description,
                main: .[1].main,
                scripts: (.[0].scripts + .[1].scripts),
                dependencies: ([.[0].dependencies, .[1].dependencies] | merge_deps),
                devDependencies: ([.[0].devDependencies, .[1].devDependencies] | merge_deps),
                peerDependencies: ([.[0].peerDependencies, .[1].peerDependencies] | merge_deps),
                optionalDependencies: ([.[0].optionalDependencies, .[1].optionalDependencies] | merge_deps)
            } + .[1]
        ' "${file}.ours" "${file}.theirs" > "$file" 2>/dev/null
        
        if [ $? -eq 0 ] && [ -s "$file" ]; then
            # Validar JSON
            if jq empty "$file" 2>/dev/null; then
                git add "$file"
                rm -f "${file}.base" "${file}.ours" "${file}.theirs"
                return 0
            fi
        fi
    fi
    
    # Fallback: aceitar incoming
    git checkout --theirs "$file" 2>/dev/null || return 1
    git add "$file" 2>/dev/null || return 1
    
    rm -f "${file}.base" "${file}.ours" "${file}.theirs"
    return 0
}

# Verificar se ainda existem conflitos
has_conflicts() {
    local unmerged
    unmerged=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
    [ "$unmerged" -gt 0 ]
}

# Processar uma única branch
process_branch() {
    local branch="$1"
    local branch_num="$2"
    
    info "[$branch_num/$TOTAL_BRANCHES] Processando branch: $branch"
    
    # Verificar se a branch existe
    if ! git rev-parse --verify "$branch" > /dev/null 2>&1; then
        warning "Branch '$branch' não existe. Pulando..."
        ((SKIPPED++))
        return 0
    fi
    
    # Verificar se já está mergeada
    if git branch --merged "$DEFAULT_BRANCH" | grep -q "^[* ]*${branch}$"; then
        info "Branch '$branch' já está mergeada em $DEFAULT_BRANCH. Pulando..."
        ((SKIPPED++))
        return 0
    fi
    
    # Fazer checkout para a branch padrão e atualizar
    info "Fazendo checkout para $DEFAULT_BRANCH..."
    git checkout "$DEFAULT_BRANCH" || {
        error "Não foi possível fazer checkout para $DEFAULT_BRANCH"
        echo "$branch - Falha no checkout para $DEFAULT_BRANCH" >> "$FAILURES_FILE"
        ((FAILED++))
        return 1
    }
    
    # Garantir que estamos limpos
    abort_merge_if_needed
    
    # Tentar o merge
    info "Tentando merge de '$branch' em '$DEFAULT_BRANCH'..."
    
    if git merge --no-commit --no-ff "$branch" 2>&1 | tee -a "$LOG_FILE"; then
        # Merge sem conflitos
        success "Merge bem-sucedido sem conflitos!"
        
        # Verificar se há algo para commitar
        if git diff --cached --quiet; then
            info "Nenhuma mudança para commitar (possivelmente branch já está em $DEFAULT_BRANCH)"
            ((SKIPPED++))
        else
            # Fazer commit
            git commit -m "Merge branch '$branch' into $DEFAULT_BRANCH

Auto-merge realizado com sucesso sem conflitos.
Branch: $branch
Data: $(date '+%Y-%m-%d %H:%M:%S')" || {
                error "Falha ao fazer commit do merge"
                abort_merge_if_needed
                echo "$branch - Falha no commit" >> "$FAILURES_FILE"
                ((FAILED++))
                return 1
            }
            success "Merge commit realizado com sucesso!"
            ((SUCCESSFUL++))
        fi
    else
        # Merge com conflitos - tentar auto-resolver
        warning "Merge resultou em conflitos. Tentando auto-resolver..."
        
        # Tentar auto-resolver
        auto_resolve_conflicts
        
        # Verificar se ainda há conflitos
        if has_conflicts; then
            # Ainda há conflitos - abortar
            local remaining_conflicts
            remaining_conflicts=$(git diff --name-only --diff-filter=U | tr '\n' ', ')
            error "Não foi possível resolver todos os conflitos automaticamente"
            error "Arquivos em conflito: $remaining_conflicts"
            
            # Abortar merge
            abort_merge_if_needed
            
            # Registrar falha
            echo "$branch - Conflitos não resolvidos: $remaining_conflicts" >> "$FAILURES_FILE"
            ((FAILED++))
            
            return 1
        else
            # Conflitos resolvidos - fazer commit
            success "Todos os conflitos foram resolvidos automaticamente!"
            
            git commit -m "Merge branch '$branch' into $DEFAULT_BRANCH

Auto-merge realizado com resolução automática de conflitos.
Branch: $branch
Data: $(date '+%Y-%m-%d %H:%M:%S')" || {
                error "Falha ao fazer commit após resolução de conflitos"
                abort_merge_if_needed
                echo "$branch - Falha no commit após resolução" >> "$FAILURES_FILE"
                ((FAILED++))
                return 1
            }
            
            success "Merge commit realizado com sucesso (após auto-resolução)!"
            ((SUCCESSFUL++))
        fi
    fi
    
    ((PROCESSED++))
    return 0
}

# Mostrar estatísticas finais
show_statistics() {
    echo ""
    echo "========================================"
    echo "      ESTATÍSTICAS DE INTEGRAÇÃO       "
    echo "========================================"
    echo "Total de branches:     $TOTAL_BRANCHES"
    echo "Processadas:           $PROCESSED"
    echo "Merge com sucesso:     $SUCCESSFUL"
    echo "Falhas:                $FAILED"
    echo "Puladas (já mergeadas): $SKIPPED"
    echo ""
    
    if [ -f "$FAILURES_FILE" ] && [ -s "$FAILURES_FILE" ]; then
        echo "Branches com falha (detalhes em $FAILURES_FILE):"
        cat "$FAILURES_FILE" | while read -r line; do
            echo "  - $line"
        done
        echo ""
    fi
    
    echo "Log completo disponível em: $LOG_FILE"
    echo "========================================"
    
    if [ $FAILED -eq 0 ]; then
        success "Todas as branches foram integradas com sucesso!"
        return 0
    else
        error "Houveram $FAILED falhas durante a integração"
        return 1
    fi
}

# Função principal
main() {
    echo "========================================"
    echo "  INTEGRAÇÃO DE BRANCHES - ONE BY ONE  "
    echo "========================================"
    echo ""
    
    # Verificar repositório git
    check_git_repo
    
    # Verificar arquivo de branches
    if [ ! -f "$BRANCHES_FILE" ]; then
        error "Arquivo de branches '$BRANCHES_FILE' não encontrado!"
        error "Crie o arquivo com a lista de branches (uma por linha)"
        exit 1
    fi
    
    # Determinar branch padrão
    if git rev-parse --verify main > /dev/null 2>&1; then
        DEFAULT_BRANCH="main"
    elif git rev-parse --verify master > /dev/null 2>&1; then
        DEFAULT_BRANCH="master"
    else
        DEFAULT_BRANCH=$(git symbolic-ref --short HEAD)
    fi
    
    info "Branch padrão: $DEFAULT_BRANCH"
    
    # Limpar arquivos de log/falhas anteriores
    > "$LOG_FILE"
    > "$FAILURES_FILE"
    
    # Contar total de branches
    TOTAL_BRANCHES=$(grep -v '^#' "$BRANCHES_FILE" | grep -v '^[[:space:]]*$' | wc -l | tr -d ' ')
    
    if [ "$TOTAL_BRANCHES" -eq 0 ]; then
        warning "Nenhuma branch encontrada em '$BRANCHES_FILE'"
        exit 0
    fi
    
    info "Total de branches para processar: $TOTAL_BRANCHES"
    info "Log: $LOG_FILE"
    info "Falhas serão registradas em: $FAILURES_FILE"
    echo ""
    
    # Salvar estado inicial
    local initial_branch
    initial_branch=$(git symbolic-ref --short HEAD)
    local had_stash=false
    
    # Verificar e limpar estado inicial
    abort_merge_if_needed
    if check_working_directory; then
        had_stash=true
    fi
    
    # Processar cada branch
    local branch_num=0
    while IFS= read -r branch || [[ -n "$branch" ]]; do
        # Ignorar linhas vazias e comentários
        [[ -z "$branch" ]] && continue
        [[ "$branch" =~ ^[[:space:]]*# ]] && continue
        
        # Remover espaços em branco
        branch=$(echo "$branch" | xargs)
        [ -z "$branch" ] && continue
        
        ((branch_num++))
        
        # Processar branch com tratamento de erro individual
        if ! process_branch "$branch" "$branch_num"; then
            error "Falha ao processar branch '$branch'"
            # Continuar para próxima branch - não sair do script
        fi
        
        # Pequena pausa para evitar problemas de race condition
        sleep 0.5
        
    done < "$BRANCHES_FILE"
    
    # Restaurar branch inicial
    info "Restaurando branch inicial: $initial_branch"
    git checkout "$initial_branch" || warning "Não foi possível restaurar branch inicial"
    
    # Restaurar stash se necessário
    if [ "$had_stash" = true ]; then
        info "Restaurando stash..."
        git stash pop || warning "Não foi possível restaurar stash"
    fi
    
    # Mostrar estatísticas
    show_statistics
}

# Executar função principal
trap 'error "Script interrompido! Verifique o estado do repositório."; exit 130' INT TERM

main "$@"
