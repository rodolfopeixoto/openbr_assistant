import fs from "node:fs";
import path from "node:path";

export type SecurityIssueSeverity = "critical" | "high" | "medium" | "low" | "info";

export type SecurityIssue = {
  type: string;
  severity: SecurityIssueSeverity;
  message: string;
  line?: number;
  column?: number;
  context?: string;
};

export type SkillSecurityScan = {
  score: number;
  level: "critical" | "high" | "medium" | "low" | "safe";
  lastScan: string;
  issues: SecurityIssue[];
  permissions: {
    filesystem: boolean;
    network: boolean;
    execution: boolean;
    env: boolean;
    elevated: boolean;
  };
  checks: {
    hasHttpsDownloads: boolean;
    hasSignedBinaries: boolean;
    usesTrustedPackageManager: boolean;
    hasDangerousCommands: boolean;
    requiresRoot: boolean;
  };
};

export type RichSkillDescription = {
  short: string;
  full: string;
  whatIs: string;
  capabilities: string[];
  examples: string[];
  requirements: string[];
  securityNotes: string[];
};

// Dangerous patterns to look for
const DANGEROUS_PATTERNS = [
  {
    pattern: /eval\s*\(/i,
    type: "dangerous-eval",
    severity: "critical" as const,
    message: "Uses eval() which can execute arbitrary code",
  },
  {
    pattern: /exec\s*\(/i,
    type: "dangerous-exec",
    severity: "high" as const,
    message: "Uses exec() for command execution",
  },
  {
    pattern: /child_process/i,
    type: "child-process",
    severity: "medium" as const,
    message: "Uses Node.js child_process module",
  },
  {
    pattern: /curl\s+.*\|\s*(bash|sh|zsh)/i,
    type: "pipe-to-shell",
    severity: "critical" as const,
    message: "Downloads and pipes to shell - major security risk",
  },
  {
    pattern: /wget.*-O-\s*\|\s*(bash|sh|zsh)/i,
    type: "pipe-to-shell",
    severity: "critical" as const,
    message: "Downloads and pipes to shell - major security risk",
  },
  {
    pattern: /sudo/i,
    type: "sudo-usage",
    severity: "high" as const,
    message: "Requires sudo/root privileges",
  },
  {
    pattern: /rm\s+-rf\s+\//i,
    type: "dangerous-rm",
    severity: "critical" as const,
    message: "Dangerous rm -rf / command detected",
  },
  {
    pattern: />\s*\/etc\//i,
    type: "system-modification",
    severity: "high" as const,
    message: "Modifies system files in /etc",
  },
  {
    pattern: />\s*~\/\.ssh/i,
    type: "ssh-modification",
    severity: "high" as const,
    message: "Modifies SSH configuration",
  },
  {
    pattern: /api[_-]?key|secret|token|password/i,
    type: "sensitive-env",
    severity: "low" as const,
    message: "Accesses sensitive credentials",
  },
];

// Trusted package managers
const TRUSTED_PACKAGE_MANAGERS = [
  "brew",
  "apt",
  "apt-get",
  "yum",
  "dnf",
  "pacman",
  "npm",
  "pnpm",
  "yarn",
  "pip",
  "uv",
];

// Signed binary sources
const SIGNED_SOURCES = ["brew", "apt", "npm", "github.com"];

function analyzeContent(
  content: string,
  filePath: string,
): {
  issues: SecurityIssue[];
  permissions: SkillSecurityScan["permissions"];
  checks: SkillSecurityScan["checks"];
} {
  const issues: SecurityIssue[] = [];
  const lines = content.split("\n");

  const permissions: SkillSecurityScan["permissions"] = {
    filesystem: false,
    network: false,
    execution: false,
    env: false,
    elevated: false,
  };

  const checks: SkillSecurityScan["checks"] = {
    hasHttpsDownloads: true,
    hasSignedBinaries: false,
    usesTrustedPackageManager: false,
    hasDangerousCommands: false,
    requiresRoot: false,
  };

  // Check for dangerous patterns
  lines.forEach((line, index) => {
    DANGEROUS_PATTERNS.forEach(({ pattern, type, severity, message }) => {
      if (pattern.test(line)) {
        issues.push({
          type,
          severity,
          message,
          line: index + 1,
          context: line.trim().substring(0, 100),
        });
        checks.hasDangerousCommands = true;

        if (type === "sudo-usage") {
          checks.requiresRoot = true;
          permissions.elevated = true;
        }
        if (type === "pipe-to-shell") {
          permissions.execution = true;
        }
      }
    });

    // Check for HTTP (not HTTPS) downloads
    if (/http:\/\//i.test(line) && !/https:\/\//i.test(line)) {
      issues.push({
        type: "insecure-download",
        severity: "high",
        message: "Uses HTTP instead of HTTPS for downloads",
        line: index + 1,
        context: line.trim().substring(0, 100),
      });
      checks.hasHttpsDownloads = false;
      permissions.network = true;
    }

    // Check for HTTPS downloads
    if (/https:\/\//i.test(line)) {
      permissions.network = true;
    }

    // Check for trusted package managers
    TRUSTED_PACKAGE_MANAGERS.forEach((pm) => {
      if (new RegExp(`\\b${pm}\\b`, "i").test(line)) {
        checks.usesTrustedPackageManager = true;
      }
    });

    // Check for signed sources
    SIGNED_SOURCES.forEach((source) => {
      if (line.toLowerCase().includes(source)) {
        checks.hasSignedBinaries = true;
      }
    });

    // Check for filesystem access
    if (/\/(bin|usr|opt|home|~|\$HOME)/i.test(line) || /file|read|write/i.test(line)) {
      permissions.filesystem = true;
    }

    // Check for env access
    if (/process\.env|env\[|\$[A-Z_]+/i.test(line) || /API_KEY|SECRET|TOKEN/i.test(line)) {
      permissions.env = true;
    }
  });

  // Check file extension for execution permissions
  if (/\.(sh|bash|zsh|py|js|ts)$/i.test(filePath)) {
    permissions.execution = true;
  }

  return { issues, permissions, checks };
}

function calculateScore(
  issues: SecurityIssue[],
  checks: SkillSecurityScan["checks"],
): { score: number; level: SkillSecurityScan["level"] } {
  let score = 100;

  // Deduct points based on issues
  issues.forEach((issue) => {
    switch (issue.severity) {
      case "critical":
        score -= 25;
        break;
      case "high":
        score -= 15;
        break;
      case "medium":
        score -= 8;
        break;
      case "low":
        score -= 3;
        break;
      case "info":
        score -= 1;
        break;
    }
  });

  // Bonus for good practices
  if (checks.usesTrustedPackageManager) score += 10;
  if (checks.hasSignedBinaries) score += 5;
  if (checks.hasHttpsDownloads && !issues.some((i) => i.type === "insecure-download")) score += 5;

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level: SkillSecurityScan["level"];
  if (score >= 80) level = "safe";
  else if (score >= 60) level = "low";
  else if (score >= 40) level = "medium";
  else if (score >= 20) level = "high";
  else level = "critical";

  return { score, level };
}

function parseRichDescription(content: string, name: string): RichSkillDescription {
  const lines = content.split("\n");
  let full = "";
  let whatIs = "";
  const capabilities: string[] = [];
  const examples: string[] = [];
  const requirements: string[] = [];
  const securityNotes: string[] = [];

  let inFrontmatter = false;
  let inWhatIs = false;
  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip frontmatter
    if (line.trim() === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;

    // Extract title/what is
    if (line.startsWith("# ") && !whatIs) {
      whatIs = line.replace("# ", "").trim();
      continue;
    }

    // Track sections
    if (line.startsWith("## ")) {
      currentSection = line.replace("## ", "").toLowerCase().trim();
      continue;
    }

    // Extract capabilities (usually after ## Workflow or ## Capabilities)
    if (
      (currentSection.includes("workflow") || currentSection.includes("capabilit")) &&
      line.trim().startsWith("- ")
    ) {
      const capability = line.replace("- ", "").trim();
      if (capability && capability.length > 10) {
        capabilities.push(capability);
      }
    }

    // Extract examples (code blocks)
    if (line.startsWith("```") && !line.includes("```")) {
      const codeBlock: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeBlock.push(lines[i]);
        i++;
      }
      const code = codeBlock.join("\n").trim();
      if (code && code.length < 200) {
        examples.push(code);
      }
      continue;
    }

    // Extract inline examples (commands)
    if (line.includes("`") && line.includes(name.toLowerCase())) {
      const matches = line.match(/`([^`]+)`/g);
      if (matches) {
        matches.forEach((match) => {
          const cmd = match.replace(/`/g, "");
          if (cmd.length > 5 && cmd.length < 100 && !examples.includes(cmd)) {
            examples.push(cmd);
          }
        });
      }
    }

    // Extract requirements
    if (
      currentSection.includes("require") ||
      currentSection.includes("install") ||
      currentSection.includes("setup")
    ) {
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const req = line.replace(/^[\-*]\s*/, "").trim();
        if (req && req.length > 5) {
          requirements.push(req);
        }
      }
    }

    // Extract security notes
    if (
      currentSection.includes("security") ||
      line.toLowerCase().includes("secure") ||
      line.toLowerCase().includes("warning")
    ) {
      if (line.trim().length > 10) {
        securityNotes.push(line.trim());
      }
    }

    // Build full description
    if (!line.startsWith("#") && line.trim()) {
      full += line + "\n";
    }
  }

  // Get short description from frontmatter or first paragraph
  let short = "";
  const frontmatterMatch = content.match(/description:\s*(.+)/);
  if (frontmatterMatch) {
    short = frontmatterMatch[1].trim();
  } else {
    const firstParagraph = full.split("\n\n")[0];
    if (firstParagraph) {
      short = firstParagraph.trim().substring(0, 200);
    }
  }

  return {
    short,
    full: full.trim().substring(0, 2000),
    whatIs: whatIs || name,
    capabilities: capabilities.slice(0, 8),
    examples: examples.slice(0, 6),
    requirements: requirements.slice(0, 5),
    securityNotes: securityNotes.slice(0, 3),
  };
}

export async function analyzeSkillFile(
  filePath: string,
): Promise<{ securityScan: SkillSecurityScan; richDescription: RichSkillDescription }> {
  if (!fs.existsSync(filePath)) {
    return {
      securityScan: {
        score: 0,
        level: "critical",
        lastScan: new Date().toISOString(),
        issues: [{ type: "file-not-found", severity: "critical", message: "Skill file not found" }],
        permissions: {
          filesystem: false,
          network: false,
          execution: false,
          env: false,
          elevated: false,
        },
        checks: {
          hasHttpsDownloads: false,
          hasSignedBinaries: false,
          usesTrustedPackageManager: false,
          hasDangerousCommands: false,
          requiresRoot: false,
        },
      },
      richDescription: {
        short: "Skill not found",
        full: "",
        whatIs: path.basename(filePath),
        capabilities: [],
        examples: [],
        requirements: [],
        securityNotes: [],
      },
    };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const name = path.basename(path.dirname(filePath));

  // Analyze security
  const { issues, permissions, checks } = analyzeContent(content, filePath);
  const { score, level } = calculateScore(issues, checks);

  const securityScan: SkillSecurityScan = {
    score,
    level,
    lastScan: new Date().toISOString(),
    issues,
    permissions,
    checks,
  };

  // Parse rich description
  const richDescription = parseRichDescription(content, name);

  return { securityScan, richDescription };
}

export function rescanSkill(
  filePath: string,
): Promise<{ securityScan: SkillSecurityScan; richDescription: RichSkillDescription }> {
  return analyzeSkillFile(filePath);
}
