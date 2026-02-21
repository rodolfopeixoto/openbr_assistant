/**
 * Blocked commands list for security
 *
 * Prevents execution of dangerous commands that could harm the system
 * Categorized by severity and type
 */

export interface BlockedCommand {
  pattern: RegExp;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  description: string;
  reason: string;
}

// Critical - System destruction commands
const CRITICAL_COMMANDS: BlockedCommand[] = [
  {
    pattern: /rm\s+-[rf]*.*\/\s*$/i,
    severity: "critical",
    category: "filesystem",
    description: "Recursive force delete of root directory",
    reason: "Will destroy entire system",
  },
  {
    pattern: /mkfs\.[a-z0-9]+\s+\/dev\/[a-z0-9]+/i,
    severity: "critical",
    category: "filesystem",
    description: "Format disk partition",
    reason: "Will destroy all data on partition",
  },
  {
    pattern: /dd\s+if=.*of=\/dev\/[a-z0-9]+/i,
    severity: "critical",
    category: "filesystem",
    description: "Direct disk write with dd",
    reason: "Can overwrite disk partitions",
  },
  {
    pattern: /\/>\s*\/dev\/[a-z0-9]+/i,
    severity: "critical",
    category: "filesystem",
    description: "Write to device file directly",
    reason: "Can corrupt disk or hardware",
  },
];

// High - System modification commands
const HIGH_COMMANDS: BlockedCommand[] = [
  {
    pattern: /shutdown\s+/i,
    severity: "high",
    category: "system",
    description: "Shutdown or reboot system",
    reason: "Will terminate all processes and shut down system",
  },
  {
    pattern: /reboot\s+/i,
    severity: "high",
    category: "system",
    description: "Reboot system",
    reason: "Will restart the system",
  },
  {
    pattern: /halt\s+/i,
    severity: "high",
    category: "system",
    description: "Halt system",
    reason: "Will stop the system",
  },
  {
    pattern: /poweroff\s+/i,
    severity: "high",
    category: "system",
    description: "Power off system",
    reason: "Will power off the system",
  },
  {
    pattern: /init\s+[06]/i,
    severity: "high",
    category: "system",
    description: "Change runlevel to shutdown/reboot",
    reason: "Will shutdown or reboot system",
  },
  {
    pattern: /systemctl\s+(poweroff|reboot|halt|suspend|hibernate)/i,
    severity: "high",
    category: "system",
    description: "System control power commands",
    reason: "Can shutdown or reboot system",
  },
  {
    pattern: /kill\s+-9\s+1\s*$/i,
    severity: "high",
    category: "system",
    description: "Kill init process",
    reason: "Will crash the system",
  },
  {
    pattern: /killall\s+-9\s+(init|systemd)/i,
    severity: "high",
    category: "system",
    description: "Kill init/systemd",
    reason: "Will crash the system",
  },
];

// High - User management
const USER_COMMANDS: BlockedCommand[] = [
  {
    pattern: /userdel\s+-r\s+root/i,
    severity: "critical",
    category: "users",
    description: "Delete root user",
    reason: "Will remove administrative access",
  },
  {
    pattern: /passwd\s+root/i,
    severity: "high",
    category: "users",
    description: "Change root password",
    reason: "Can lock out system access",
  },
  {
    pattern: /usermod\s+-L\s+root/i,
    severity: "high",
    category: "users",
    description: "Lock root account",
    reason: "Will disable root access",
  },
];

// High - Network security
const NETWORK_COMMANDS: BlockedCommand[] = [
  {
    pattern: /iptables\s+-F/i,
    severity: "high",
    category: "network",
    description: "Flush all firewall rules",
    reason: "Will remove all firewall protection",
  },
  {
    pattern: /ufw\s+disable/i,
    severity: "high",
    category: "network",
    description: "Disable UFW firewall",
    reason: "Will disable firewall protection",
  },
  {
    pattern: /echo\s+0\s+>\s*\/proc\/sys\/net\/ipv4\/icmp_echo_ignore_all/i,
    severity: "medium",
    category: "network",
    description: "Disable ICMP echo ignore",
    reason: "Can expose system to ping attacks",
  },
];

// Medium - File operations that could be dangerous
const FILE_COMMANDS: BlockedCommand[] = [
  {
    pattern: /chmod\s+-R\s+777\s+\//i,
    severity: "critical",
    category: "filesystem",
    description: "Make entire filesystem world-writable",
    reason: "Extreme security risk",
  },
  {
    pattern: /chmod\s+-R\s+000\s+\//i,
    severity: "critical",
    category: "filesystem",
    description: "Remove all permissions from filesystem",
    reason: "Will lock system",
  },
  {
    pattern: /chown\s+-R\s+\d+:\d+\s+\//i,
    severity: "high",
    category: "filesystem",
    description: "Change ownership of entire filesystem",
    reason: "Can break system permissions",
  },
  {
    pattern: /rm\s+-rf\s+\/(bin|sbin|usr|lib|etc|var)/i,
    severity: "critical",
    category: "filesystem",
    description: "Delete system directories",
    reason: "Will destroy system",
  },
  {
    pattern: /rm\s+-rf\s+.*\/\.\./i,
    severity: "high",
    category: "filesystem",
    description: "Delete parent directory recursively",
    reason: "Can destroy parent directories",
  },
];

// Medium - Package management risks
const PACKAGE_COMMANDS: BlockedCommand[] = [
  {
    pattern: /apt-get\s+remove\s+.*systemd/i,
    severity: "high",
    category: "packages",
    description: "Remove systemd",
    reason: "Will break system init",
  },
  {
    pattern: /dpkg\s+--remove\s+.*libc/i,
    severity: "critical",
    category: "packages",
    description: "Remove libc",
    reason: "Will break all programs",
  },
  {
    pattern: /rpm\s+-e\s+.*glibc/i,
    severity: "critical",
    category: "packages",
    description: "Remove glibc",
    reason: "Will break all programs",
  },
  {
    pattern: /pacman\s+-R\s+.*glibc/i,
    severity: "critical",
    category: "packages",
    description: "Remove glibc",
    reason: "Will break all programs",
  },
];

// Low - Potentially risky but sometimes needed
const MEDIUM_COMMANDS: BlockedCommand[] = [
  {
    pattern: /:\(\)\{\s*:\u007c:\u0026\s*\};;:/i,
    severity: "critical",
    category: "fork-bomb",
    description: "Fork bomb",
    reason: "Will exhaust system resources",
  },
  {
    pattern: /while\s*\(\s*true\s*\)\s*\{\s*fork\s*\(\s*\)/i,
    severity: "critical",
    category: "fork-bomb",
    description: "Fork bomb loop",
    reason: "Will exhaust system resources",
  },
  {
    pattern: /wget\s+.*\|\s*bash/i,
    severity: "high",
    category: "execution",
    description: "Download and execute script",
    reason: "Can execute malicious code",
  },
  {
    pattern: /curl\s+.*\|\s*sh/i,
    severity: "high",
    category: "execution",
    description: "Download and execute script",
    reason: "Can execute malicious code",
  },
  {
    pattern: /eval\s*\$\s*\(/i,
    severity: "medium",
    category: "execution",
    description: "Eval with command substitution",
    reason: "Can execute arbitrary code",
  },
];

// Combine all blocked commands
export const BLOCKED_COMMANDS: BlockedCommand[] = [
  ...CRITICAL_COMMANDS,
  ...HIGH_COMMANDS,
  ...USER_COMMANDS,
  ...NETWORK_COMMANDS,
  ...FILE_COMMANDS,
  ...PACKAGE_COMMANDS,
  ...MEDIUM_COMMANDS,
];

/**
 * Check if a command is blocked
 */
export function isCommandBlocked(command: string): BlockedCommand | null {
  for (const blocked of BLOCKED_COMMANDS) {
    if (blocked.pattern.test(command)) {
      return blocked;
    }
  }
  return null;
}

/**
 * Validate multiple commands
 */
export function validateCommands(commands: string[]): {
  valid: boolean;
  blocked: Array<{ command: string; blocked: BlockedCommand }>;
} {
  const blocked: Array<{ command: string; blocked: BlockedCommand }> = [];

  for (const command of commands) {
    const blockedCmd = isCommandBlocked(command);
    if (blockedCmd) {
      blocked.push({ command, blocked: blockedCmd });
    }
  }

  return {
    valid: blocked.length === 0,
    blocked,
  };
}

/**
 * Get all blocked commands by severity
 */
export function getBlockedCommandsBySeverity(
  severity: BlockedCommand["severity"],
): BlockedCommand[] {
  return BLOCKED_COMMANDS.filter((cmd) => cmd.severity === severity);
}

/**
 * Get statistics about blocked commands
 */
export function getBlockedCommandsStats(): {
  total: number;
  bySeverity: Record<BlockedCommand["severity"], number>;
  byCategory: Record<string, number>;
} {
  const bySeverity: Record<BlockedCommand["severity"], number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const byCategory: Record<string, number> = {};

  for (const cmd of BLOCKED_COMMANDS) {
    bySeverity[cmd.severity]++;
    byCategory[cmd.category] = (byCategory[cmd.category] || 0) + 1;
  }

  return {
    total: BLOCKED_COMMANDS.length,
    bySeverity,
    byCategory,
  };
}
