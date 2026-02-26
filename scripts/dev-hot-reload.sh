#!/bin/bash
#
# Hot Reload Script for OpenClaw Development
# Automatically cleans data, rebuilds, and restarts services
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GATEWAY_PORT=18789
UI_PORT=18789
TOKEN="886c104bee1dbbc2d5fd8feb407f89ccb03a6118b42570bf7356a1d45e4f988a"
LOG_DIR="/tmp"

# Functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Kill all OpenClaw processes
kill_openclaw() {
  log_info "Killing existing OpenClaw processes..."
  pkill -9 -f "openclaw-gateway" 2>/dev/null || true
  pkill -9 -f "openclaw run" 2>/dev/null || true
  pkill -9 -f "openclaw dashboard" 2>/dev/null || true
  sleep 2
  
  # Force kill if still running
  for pid in $(pgrep -f "openclaw" 2>/dev/null || true); do
    if [ -n "$pid" ]; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
  
  sleep 1
  log_success "Processes killed"
}

# Clear browser data (localStorage)
clear_browser_data() {
  log_info "Clearing browser data (localStorage)..."
  
  # Create a simple HTML file to clear localStorage
  cat > /tmp/openclaw-clear-storage.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Clear OpenClaw Storage</title>
  <script>
    // Clear all openclaw related storage
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('openclaw')) {
        keys.push(key);
      }
    }
    keys.forEach(key => {
      console.log('Removing:', key);
      localStorage.removeItem(key);
    });
    
    // Also clear sessionStorage
    sessionStorage.clear();
    
    document.body.innerHTML = '<h1>Storage Cleared!</h1><p>You can close this tab.</p>';
    setTimeout(() => window.close(), 2000);
  </script>
</head>
<body>
  <h1>Clearing OpenClaw Storage...</h1>
</body>
</html>
EOF
  
  log_success "Browser clear script created"
}

# Clear build cache
clear_build_cache() {
  log_info "Clearing build cache..."
  rm -rf dist/control-ui/assets/*.js 2>/dev/null || true
  rm -rf dist/control-ui/assets/*.css 2>/dev/null || true
  rm -rf node_modules/.vite 2>/dev/null || true
  log_success "Build cache cleared"
}

# Build project
build_project() {
  log_info "Building project..."
  
  # Build TypeScript
  if ! pnpm build 2>&1; then
    log_error "TypeScript build failed!"
    exit 1
  fi
  
  # Build UI (Vite)
  log_info "Building UI (Vite)..."
  cd ui && pnpm run build 2>&1 || {
    log_error "UI build failed!"
    exit 1
  }
  cd ..
  
  log_success "Build completed"
}

# Start Gateway
start_gateway() {
  log_info "Starting Gateway on port $GATEWAY_PORT..."
  
  # Clear old logs
  > "$LOG_DIR/openclaw-gateway.log"
  
  openclaw gateway run --port $GATEWAY_PORT > "$LOG_DIR/openclaw-gateway.log" 2>&1 &
  GATEWAY_PID=$!
  
  log_info "Gateway PID: $GATEWAY_PID"
  
  # Wait for gateway to be ready
  log_info "Waiting for gateway to start..."
  for i in {1..30}; do
    if curl -s http://127.0.0.1:$GATEWAY_PORT/ui/ > /dev/null 2>&1; then
      log_success "Gateway is ready!"
      return 0
    fi
    sleep 1
  done
  
  log_error "Gateway failed to start within 30 seconds"
  tail -20 "$LOG_DIR/openclaw-gateway.log"
  exit 1
}

# Start UI
start_ui() {
  log_info "Starting Control UI..."
  
  > "$LOG_DIR/openclaw-ui.log"
  
  # Use dashboard command which handles token automatically
  openclaw dashboard --no-open > "$LOG_DIR/openclaw-ui.log" 2>&1 &
  UI_PID=$!
  
  log_info "UI PID: $UI_PID"
  sleep 3
  
  log_success "UI started"
}

# Check services health
check_health() {
  log_info "Checking services health..."
  
  # Check Gateway
  if ! curl -s http://127.0.0.1:$GATEWAY_PORT/ui/ > /dev/null 2>&1; then
    log_error "Gateway is not responding"
    return 1
  fi
  log_success "Gateway is healthy"
  
  # Check if processes are running
  if ! pgrep -f "openclaw-gateway" > /dev/null; then
    log_error "Gateway process not found"
    return 1
  fi
  
  log_success "All services are running"
  return 0
}

# Open browser
open_browser() {
  local url="http://127.0.0.1:$GATEWAY_PORT/ui/#token=$TOKEN"
  log_info "Opening browser: $url"
  
  # Try different methods to open browser
  if command -v open >/dev/null 2>&1; then
    # macOS
    open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    xdg-open "$url"
  elif command -v start >/dev/null 2>&1; then
    # Windows (Git Bash)
    start "$url"
  else
    log_warning "Could not open browser automatically"
    echo -e "${GREEN}Please open:${NC} $url"
  fi
}

# Print status
print_status() {
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  OpenClaw Hot Reload Complete!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo -e "${BLUE}Gateway:${NC} http://127.0.0.1:$GATEWAY_PORT"
  echo -e "${BLUE}UI:${NC} http://127.0.0.1:$GATEWAY_PORT/ui/"
  echo -e "${BLUE}Direct URL with token:${NC}"
  echo "http://127.0.0.1:$GATEWAY_PORT/ui/#token=$TOKEN"
  echo ""
  echo -e "${YELLOW}Features available:${NC}"
  echo "  - Overview, Features, Channels, Instances, Sessions, Cron"
  echo "  - News (27 RSS sources)"
  echo "  - Skills, Nodes, OpenCode, MCP"
  echo "  - Models, Model Routing, Local LLM"
  echo "  - Containers, Security, Rate Limits, Budget, Metrics, Cache"
  echo ""
  echo -e "${YELLOW}Logs:${NC}"
  echo "  Gateway: tail -f $LOG_DIR/openclaw-gateway.log"
  echo "  UI: tail -f $LOG_DIR/openclaw-ui.log"
  echo ""
  echo -e "${GREEN}All 27 features are ready! 🚀${NC}"
}

# Main execution
main() {
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  OpenClaw Hot Reload${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  
  # Step 1: Kill existing processes
  kill_openclaw
  
  # Step 2: Clear data
  clear_browser_data
  clear_build_cache
  
  # Step 3: Build
  build_project
  
  # Step 4: Start services
  start_gateway
  start_ui
  
  # Step 5: Health check
  if ! check_health; then
    log_error "Health check failed!"
    exit 1
  fi
  
  # Step 6: Open browser
  open_browser
  
  # Step 7: Print status
  print_status
  
  log_info "Hot reload complete! Monitoring logs..."
  echo ""
  
  # Show recent logs
  tail -20 "$LOG_DIR/openclaw-gateway.log"
}

# Run main
main "$@"
