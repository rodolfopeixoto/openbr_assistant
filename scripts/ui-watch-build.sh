#!/bin/bash
# Script para desenvolvimento rápido da UI
# Faz build automático a cada alteração

echo "Iniciando build contínuo da UI..."
echo "Pressione Ctrl+C para parar"
echo ""

# Função para fazer build
build_ui() {
  echo "[$(date '+%H:%M:%S')] Alteração detectada, fazendo build..."
  pnpm ui:build 2>&1 | grep -E "(error|warning|built|dist)" || echo "Build completo"
  echo "[$(date '+%H:%M:%S')] Build finalizado. Recarregue a página."
  echo ""
}

# Build inicial
echo "Build inicial..."
pnpm ui:build

# Monitorar alterações nos arquivos da UI
fswatch -o ui/src/ 2>/dev/null | while read; do
  build_ui
done &

# Fallback se fswatch não estiver disponível
if ! command -v fswatch &> /dev/null; then
  echo "fswatch não encontrado. Usando polling a cada 5 segundos..."
  while true; do
    sleep 5
    if [ -n "$(find ui/src/ -newer dist/control-ui/ -type f 2>/dev/null | head -1)" ]; then
      build_ui
    fi
  done
fi

wait