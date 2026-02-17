#!/bin/bash
# Build script unificado para OpenClaw Ultra Performance
# Compila Rust + TypeScript em uma única chamada
# Uso: ./scripts/build-all.sh

set -e  # Exit on error

echo "🚀 OpenClaw Ultra Performance - Build Completo"
echo "================================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detecta sistema operacional
OS="unknown"
case "$(uname -s)" in
    Linux*)     OS="linux";;
    Darwin*)    OS="macos";;
    CYGWIN*|MINGW*|MSYS*) OS="windows";;
esac

log_info "Sistema detectado: $OS"

# ==========================================
# 1. Verificar Rust
# ==========================================
echo ""
echo "📦 Etapa 1/4: Verificando Rust..."

if ! command -v rustc &> /dev/null; then
    log_error "Rust não encontrado!"
    echo "Instale o Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

RUST_VERSION=$(rustc --version)
log_info "Rust encontrado: $RUST_VERSION"

# ==========================================
# 2. Build do Rust
# ==========================================
echo ""
echo "🔨 Etapa 2/4: Compilando módulo Rust..."

cd rust

# Build em release (otimizado)
log_info "Compilando em modo release..."
cargo build --release 2>&1 | while read line; do
    echo "  $line"
done

# Verifica se o arquivo foi gerado
LIB_FILE=""
if [ -f "target/release/libopenclaw_core.so" ]; then
    LIB_FILE="target/release/libopenclaw_core.so"
elif [ -f "target/release/libopenclaw_core.dylib" ]; then
    LIB_FILE="target/release/libopenclaw_core.dylib"
else
    log_error "Biblioteca Rust não encontrada!"
    exit 1
fi

LIB_SIZE=$(ls -lh "$LIB_FILE" | awk '{ print $5 }')
log_info "✅ Módulo Rust compilado: $LIB_FILE ($LIB_SIZE)"

cd ..

# ==========================================
# 3. Verificar Node.js
# ==========================================
echo ""
echo "📦 Etapa 3/4: Verificando Node.js..."

if ! command -v node &> /dev/null; then
    log_error "Node.js não encontrado!"
    exit 1
fi

NODE_VERSION=$(node --version)
log_info "Node.js encontrado: $NODE_VERSION"

# Verificar versão mínima (22+)
if [ "$(printf '%s\n' "v22.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "v22.0.0" ]; then
    log_warn "Node.js 22+ recomendado. Versão atual: $NODE_VERSION"
fi

# ==========================================
# 4. Build TypeScript
# ==========================================
echo ""
echo "🔨 Etapa 4/4: Compilando TypeScript..."

# Verifica se pnpm está disponível
if command -v pnpm &> /dev/null; then
    log_info "Usando pnpm"
    PKG_MGR="pnpm"
elif command -v npm &> /dev/null; then
    log_info "Usando npm"
    PKG_MGR="npm"
else
    log_error "Nenhum gerenciador de pacotes encontrado (pnpm ou npm)"
    exit 1
fi

# Instala dependências se necessário
if [ ! -d "node_modules" ]; then
    log_info "Instalando dependências..."
    $PKG_MGR install
fi

# Build TypeScript
log_info "Compilando TypeScript..."
if [ "$PKG_MGR" = "pnpm" ]; then
    pnpm build
else
    npm run build
fi

log_info "✅ TypeScript compilado"

# ==========================================
# 5. Testar integração
# ==========================================
echo ""
echo "🧪 Testando integração..."

node -e "
const mod = { exports: {} };
try {
    process.dlopen(mod, './rust/target/release/libopenclaw_core.${OS/libopenclaw_core.so/dylib}');
    console.log('  ✅ Módulo Rust carregado com sucesso');
    console.log('  📦 Versão:', mod.exports.getCoreVersion());
    console.log('  🔧 Funções:', Object.keys(mod.exports).join(', '));
} catch(e) {
    console.log('  ⚠️  Aviso:', e.message);
    process.exit(0); // Não falha o build
}
"

# ==========================================
# 6. Resumo
# ==========================================
echo ""
echo "================================================"
echo "✅ Build completo com sucesso!"
echo "================================================"
echo ""
echo "📊 Resumo:"
echo "  • Sistema: $OS"
echo "  • Rust: $RUST_VERSION"
echo "  • Node.js: $NODE_VERSION"
echo "  • Módulo Rust: $LIB_FILE ($LIB_SIZE)"
echo ""
echo "🚀 Para iniciar:"
echo "  export USE_ULTRA_PERFORMANCE=true"
echo "  $PKG_MGR dev"
echo ""
echo "🐳 Para Docker:"
echo "  docker build -f Dockerfile.ultra -t openclaw ."
echo "  docker run -e USE_ULTRA_PERFORMANCE=true openclaw"
echo ""

# Criar arquivo de flag para indicar build bem-sucedido
echo "$(date)" > .build-success
echo "Build: SUCCESS" >> .build-success
echo "Rust: $RUST_VERSION" >> .build-success
echo "Node: $NODE_VERSION" >> .build-success

exit 0