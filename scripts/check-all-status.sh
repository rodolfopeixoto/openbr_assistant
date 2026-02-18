#!/bin/bash
# check-all-status.sh - Quick status check for all features

WORKTREE_BASE="../openbr-worktrees"

echo "🛡️  OpenClaw Security Team - Status Overview"
echo "═══════════════════════════════════════════════════════"
echo ""
printf "%-35s %-12s %-15s\n" "FEATURE" "STATUS" "AGENT"
printf "%-35s %-12s %-15s\n" "-----------------------------------" "------------" "---------------"

for wt in "$WORKTREE_BASE"/SEC-*; do
    if [ -d "$wt" ]; then
        feature=$(basename "$wt")
        
        # Read status
        if [ -f "$wt/.agent-status" ]; then
            status=$(cat "$wt/.agent-status")
        else
            status="NOT_STARTED"
        fi
        
        # Read assignee
        if [ -f "$wt/.agent-assignee" ]; then
            assignee=$(cat "$wt/.agent-assignee")
        else
            assignee="Unassigned"
        fi
        
        # Color coding
        case "$status" in
            "DONE") color="\033[0;32m" ;;      # Green
            "IN_PROGRESS") color="\033[1;33m" ;; # Yellow
            "BLOCKED") color="\033[0;31m" ;;     # Red
            *) color="\033[0m" ;;                 # Default
        esac
        
        printf "${color}%-35s\033[0m %-12s %-15s\n" "$feature" "$status" "$assignee"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Total: $(ls -d "$WORKTREE_BASE"/SEC-* 2>/dev/null | wc -l) features"
echo ""
echo "Comandos úteis:"
echo "  ./scripts/coordinator.sh status     - Ver status detalhado"
echo "  ./scripts/coordinator.sh sync       - Sincronizar feature"
echo "  ./scripts/coordinator.sh integrate  - Integrar feature"
