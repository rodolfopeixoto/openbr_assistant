#!/bin/bash
# Script para limpar cache e forçar reload da UI

echo "🧹 Limpando cache do navegador..."

# Verifica se estamos no macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Detectado macOS"
    
    # Limpa cache do Chrome
    if [ -d "$HOME/Library/Caches/Google/Chrome" ]; then
        echo "  - Limpando cache do Chrome..."
        rm -rf "$HOME/Library/Caches/Google/Chrome/Default/Cache"/*
    fi
    
    # Limpa cache do Safari  
    if [ -d "$HOME/Library/Caches/com.apple.Safari" ]; then
        echo "  - Limpando cache do Safari..."
        rm -rf "$HOME/Library/Caches/com.apple.Safari"/*
    fi
    
    # Limpa cache do Firefox
    if [ -d "$HOME/Library/Caches/Firefox" ]; then
        echo "  - Limpando cache do Firefox..."
        rm -rf "$HOME/Library/Caches/Firefox"/*
    fi
fi

echo ""
echo "✅ Cache limpo!"
echo ""
echo "Instruções:"
echo "1. Feche todas as abas do navegador abertas"
echo "2. Abra a aplicação novamente"
echo "3. Use Ctrl+Shift+R (Cmd+Shift+R no Mac) para forçar reload"
echo ""
echo "Alternativamente, abra o DevTools (F12) e:"
echo "- Vá em Application > Clear storage > Clear site data"
echo "- Ou use a aba Network e marque 'Disable cache'"
