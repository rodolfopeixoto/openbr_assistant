import { exec } from "child_process";
import { createHash } from "crypto";
import { readFile, stat } from "fs/promises";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface SecurityScanResult {
  timestamp: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  vulnerabilities: Vulnerability[];
  secrets: SecretFinding[];
  configIssues: ConfigIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "dependency" | "config" | "secret" | "permission";
  file?: string;
  line?: number;
  recommendation: string;
  autoFixable: boolean;
  fixCommand?: string;
}

export interface SecretFinding {
  id: string;
  type: string;
  file: string;
  line: number;
  severity: "critical" | "high" | "medium" | "low";
  snippet: string;
  recommendation: string;
}

export interface ConfigIssue {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  recommendation: string;
}

function hashCode(str: string): string {
  return createHash("md5").update(str).digest("hex").substring(0, 8);
}

export class SecurityScanner {
  async runFullScan(): Promise<SecurityScanResult> {
    const timestamp = new Date().toISOString();

    // Rodar todos os scanners em paralelo
    const [npmVulns, secretFindings, configIssues] = await Promise.all([
      this.scanNpmDependencies(),
      this.scanSecrets(),
      this.scanConfigurations(),
    ]);

    const vulnerabilities = [
      ...npmVulns,
      ...configIssues.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        severity: c.severity,
        category: "config" as const,
        recommendation: c.recommendation,
        autoFixable: false,
      })),
    ];

    const score = this.calculateScore(vulnerabilities, secretFindings);
    const grade = this.scoreToGrade(score);

    return {
      timestamp,
      score,
      grade,
      vulnerabilities,
      secrets: secretFindings,
      configIssues,
      summary: this.calculateSummary(vulnerabilities),
    };
  }

  private async scanNpmDependencies(): Promise<Vulnerability[]> {
    try {
      const { stdout } = await execAsync("npm audit --json", { cwd: process.cwd() });
      const audit = JSON.parse(stdout);

      const vulns: Vulnerability[] = [];

      // Parse npm audit v1 format
      if (audit.vulnerabilities) {
        for (const [pkg, info] of Object.entries(audit.vulnerabilities as Record<string, any>)) {
          const via = info.via?.[0];
          if (via && typeof via === "object") {
            vulns.push({
              id: `npm-${via.source || pkg}`,
              title: `${pkg} - ${info.severity} vulnerability`,
              description: via.title || "Unknown vulnerability",
              severity: info.severity,
              category: "dependency",
              recommendation: info.fixAvailable ? `Run: npm audit fix` : `Update ${pkg} manually`,
              autoFixable: !!info.fixAvailable,
              fixCommand: info.fixAvailable ? `npm audit fix` : undefined,
            });
          }
        }
      }

      return vulns;
    } catch (err: any) {
      // npm audit returns non-zero exit code when vulnerabilities found
      if (err.stdout) {
        try {
          const audit = JSON.parse(err.stdout);
          const vulns: Vulnerability[] = [];

          if (audit.vulnerabilities) {
            for (const [pkg, info] of Object.entries(
              audit.vulnerabilities as Record<string, any>,
            )) {
              const via = info.via?.[0];
              if (via && typeof via === "object") {
                vulns.push({
                  id: `npm-${via.source || pkg}`,
                  title: `${pkg} - ${info.severity} vulnerability`,
                  description: via.title || "Unknown vulnerability",
                  severity: info.severity,
                  category: "dependency",
                  recommendation: info.fixAvailable
                    ? `Run: npm audit fix`
                    : `Update ${pkg} manually`,
                  autoFixable: !!info.fixAvailable,
                  fixCommand: info.fixAvailable ? `npm audit fix` : undefined,
                });
              }
            }
          }

          return vulns;
        } catch {
          console.error("[Security] Failed to parse npm audit output:", err);
          return [];
        }
      }
      console.error("[Security] npm audit failed:", err);
      return [];
    }
  }

  private async scanSecrets(): Promise<SecretFinding[]> {
    const findings: SecretFinding[] = [];

    // Padrões de secrets comuns
    const patterns = [
      {
        name: "API Key",
        pattern: /['"`]([a-zA-Z_]+_API_KEY|API_KEY)['"`]\s*[:=]\s*['"`]([a-zA-Z0-9_-]{20,})['"`]/gi,
        severity: "critical" as const,
      },
      {
        name: "Private Key",
        pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/gi,
        severity: "critical" as const,
      },
      {
        name: "Password",
        pattern: /['"`](password|passwd|pwd)['"`]\s*[:=]\s*['"`]([^'"`\s]{8,})['"`]/gi,
        severity: "high" as const,
      },
      {
        name: "Token",
        pattern:
          /['"`](token|auth_token|access_token|bearer_token)['"`]\s*[:=]\s*['"`]([a-zA-Z0-9_-]{20,})['"`]/gi,
        severity: "critical" as const,
      },
      {
        name: "AWS Access Key",
        pattern: /AKIA[0-9A-Z]{16}/g,
        severity: "critical" as const,
      },
      {
        name: "GitHub Token",
        pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
        severity: "critical" as const,
      },
      {
        name: "Slack Token",
        pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
        severity: "critical" as const,
      },
      {
        name: "Generic Secret",
        pattern:
          /['"`](secret|api_secret|app_secret)['"`]\s*[:=]\s*['"`]([a-zA-Z0-9_-]{16,})['"`]/gi,
        severity: "high" as const,
      },
    ];

    // Verificar apenas arquivos principais do projeto
    const filesToCheck = [
      "src/config/feature-registry.ts",
      "src/gateway/server-methods.ts",
      "src/services/news-aggregator.ts",
      "ui/src/ui/app.ts",
      ".env",
      ".env.local",
    ];

    for (const file of filesToCheck) {
      try {
        const content = await readFile(file, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Skip comments and example lines
          if (
            line.trim().startsWith("//") ||
            line.trim().startsWith("#") ||
            line.trim().startsWith("*")
          ) {
            continue;
          }

          if (line.includes("example") || line.includes("placeholder")) {
            continue;
          }

          for (const { name, pattern, severity } of patterns) {
            pattern.lastIndex = 0; // Reset regex
            if (pattern.test(line)) {
              findings.push({
                id: `secret-${hashCode(file + i)}`,
                type: name,
                file: file,
                line: i + 1,
                severity,
                snippet: line.trim().substring(0, 100),
                recommendation: "Move to environment variables or use a secrets manager",
              });
            }
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return findings;
  }

  private async scanConfigurations(): Promise<ConfigIssue[]> {
    const issues: ConfigIssue[] = [];

    try {
      // Verificar configurações inseguras
      const homeDir = process.env.HOME || process.env.USERPROFILE || "/tmp";
      const configPath = `${homeDir}/.openclaw/config.json`;

      try {
        const configContent = await readFile(configPath, "utf-8");
        const config = JSON.parse(configContent);

        // 1. Verificar se gateway.controlUi.allowInsecureAuth está true
        if (config.gateway?.controlUi?.allowInsecureAuth) {
          issues.push({
            id: "config-insecure-auth",
            title: "Insecure authentication enabled",
            description:
              "gateway.controlUi.allowInsecureAuth is set to true. This allows authentication over HTTP.",
            severity: "high",
            recommendation:
              "Set gateway.controlUi.allowInsecureAuth to false and use HTTPS/Tailscale",
          });
        }

        // 2. Verificar se há tokens no config
        const configStr = JSON.stringify(config);
        if (
          /[a-zA-Z0-9_-]{30,}/.test(configStr) &&
          (configStr.includes("token") || configStr.includes("key"))
        ) {
          // Verificar se parece ser um token real
          const hasLongString = /['"`][a-zA-Z0-9_-]{30,}['"`]/.test(configStr);
          if (hasLongString) {
            issues.push({
              id: "config-hardcoded-secrets",
              title: "Potential hardcoded secrets in config",
              description: "Config file may contain hardcoded tokens or API keys",
              severity: "medium",
              recommendation: "Use environment variables for secrets. Set via OPENCLAW_* env vars",
            });
          }
        }
      } catch {
        // Config file doesn't exist or can't be read
      }

      // 3. Verificar permissões do config
      try {
        const stats = await stat(configPath);
        const mode = stats.mode & 0o777;
        if (mode & 0o044) {
          issues.push({
            id: `config-perms-${hashCode(configPath)}`,
            title: `Insecure file permissions: config.json`,
            description: `File is readable by other users (mode: ${mode.toString(8)})`,
            severity: "medium",
            recommendation: `Run: chmod 600 ${configPath}`,
          });
        }
      } catch {
        // Can't stat file
      }

      // 4. Verificar se .env files existem
      const envFiles = [".env", ".env.local"];
      for (const envFile of envFiles) {
        try {
          const stats = await stat(envFile);
          const mode = stats.mode & 0o777;
          if (mode & 0o044) {
            issues.push({
              id: `env-perms-${hashCode(envFile)}`,
              title: `Insecure permissions on ${envFile}`,
              description: "Environment file is readable by other users",
              severity: "high",
              recommendation: `Run: chmod 600 ${envFile}`,
            });
          }
        } catch {
          // File doesn't exist
        }
      }
    } catch (err) {
      console.error("[Security] Error scanning configurations:", err);
    }

    return issues;
  }

  private calculateScore(vulns: Vulnerability[], secrets: SecretFinding[]): number {
    let score = 100;

    // Deduzir por vulnerabilidades
    for (const v of vulns) {
      switch (v.severity) {
        case "critical":
          score -= 15;
          break;
        case "high":
          score -= 10;
          break;
        case "medium":
          score -= 5;
          break;
        case "low":
          score -= 2;
          break;
        case "info":
          score -= 0;
          break;
      }
    }

    // Deduzir por secrets expostos
    for (const s of secrets) {
      switch (s.severity) {
        case "critical":
          score -= 20;
          break;
        case "high":
          score -= 10;
          break;
        case "medium":
          score -= 5;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
    if (score >= 90) {
      return "A";
    }
    if (score >= 80) {
      return "B";
    }
    if (score >= 70) {
      return "C";
    }
    if (score >= 60) {
      return "D";
    }
    return "F";
  }

  private calculateSummary(vulns: Vulnerability[]) {
    return {
      critical: vulns.filter((v) => v.severity === "critical").length,
      high: vulns.filter((v) => v.severity === "high").length,
      medium: vulns.filter((v) => v.severity === "medium").length,
      low: vulns.filter((v) => v.severity === "low").length,
      info: vulns.filter((v) => v.severity === "info").length,
    };
  }
}
