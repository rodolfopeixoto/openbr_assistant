#!/bin/bash
#
# UI Development Helper Script
# Handles building and watching UI changes
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_help() {
    echo -e "${BLUE}UI Development Helper${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  dev       - Start Vite dev server (hot reload at http://localhost:5173)"
    echo "  build     - Build UI for production"
    echo "  watch     - Watch for changes and auto-rebuild"
    echo "  serve     - Serve built UI from dist/"
    echo "  clean     - Clean build cache"
    echo "  help      - Show this help"
    echo ""
    echo "Important Notes:"
    echo "  - In DEV mode: Access UI at http://localhost:5173"
    echo "  - In PROD mode: Access UI through gateway at http://localhost:18789/ui"
    echo "  - After editing UI source files, you MUST rebuild for gateway to see changes"
    echo ""
}

cmd_dev() {
    echo -e "${GREEN}Starting Vite dev server...${NC}"
    echo -e "${YELLOW}Access UI at: http://localhost:5173${NC}"
    echo -e "${YELLOW}Note: Gateway (port 18789) will NOT show these changes automatically${NC}"
    echo ""
    cd ui && pnpm dev
}

cmd_build() {
    echo -e "${GREEN}Building UI...${NC}"
    cd ui && pnpm build
    echo -e "${GREEN}Build complete!${NC}"
    echo -e "${YELLOW}Gateway will now serve the updated UI at http://localhost:18789/ui${NC}"
}

cmd_watch() {
    echo -e "${GREEN}Watching for changes...${NC}"
    echo -e "${YELLOW}UI will auto-rebuild when files change${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    
    # Build initially
    cmd_build
    
    # Watch for changes using fswatch or fallback to polling
    if command -v fswatch &> /dev/null; then
        fswatch -o ui/src/ | while read; do
            echo -e "${BLUE}[$(date '+%H:%M:%S')] Changes detected, rebuilding...${NC}"
            cmd_build
        done
    else
        echo -e "${YELLOW}fswatch not found, using polling (5s interval)${NC}"
        while true; do
            sleep 5
            if [ -n "$(find ui/src/ -newer dist/control-ui/index.html -type f 2>/dev/null | head -1)" ]; then
                echo -e "${BLUE}[$(date '+%H:%M:%S')] Changes detected, rebuilding...${NC}"
                cmd_build
            fi
        done
    fi
}

cmd_serve() {
    echo -e "${GREEN}Serving built UI from dist/control-ui/${NC}"
    echo -e "${YELLOW}Access at: http://localhost:3000${NC}"
    cd dist/control-ui && python3 -m http.server 3000 || python -m http.server 3000
}

cmd_clean() {
    echo -e "${YELLOW}Cleaning build cache...${NC}"
    rm -rf dist/control-ui
    rm -rf ui/node_modules/.vite
    echo -e "${GREEN}Clean complete${NC}"
}

# Main
case "${1:-}" in
    dev)
        cmd_dev
        ;;
    build)
        cmd_build
        ;;
    watch)
        cmd_watch
        ;;
    serve)
        cmd_serve
        ;;
    clean)
        cmd_clean
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac