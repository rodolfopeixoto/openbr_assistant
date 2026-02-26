/**
 * Security Scanner Implementation
 * Scans repositories for vulnerabilities, secrets, and suspicious files
 */

import { readFile, readdir } from "fs/promises";
import { join, extname } from "path";
import type {
  SecurityScanner,
  SecurityReport,
  Vulnerability,
  Secret,
  SuspiciousFile,
} from "../types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";

const log = createSubsystemLogger("ralph:security");

// Patterns for detecting secrets
const SECRET_PATTERNS = [
  { type: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/g, severity: "critical" as const },
  {
    type: "AWS Secret Key",
    pattern: /['"`]?[a-zA-Z0-9/+=]{40}['"`]?/g,
    severity: "critical" as const,
  },
  {
    type: "Generic API Key",
    pattern:
      /['"`]?[a-zA-Z_]+[a-zA-Z0-9_]*_?(?:key|token|secret|password)[\s]*[:=][\s]*['"`][a-zA-Z0-9_\-.]{20,}['"`]/gi,
    severity: "high" as const,
  },
  {
    type: "Private Key",
    pattern: /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: "critical" as const,
  },
  { type: "GitHub Token", pattern: /gh[pousr]_[A-Za-z0-9_]{36}/g, severity: "high" as const },
  {
    type: "Slack Token",
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}(-[a-zA-Z0-9]{24})?/g,
    severity: "high" as const,
  },
  {
    type: "Discord Token",
    pattern: /[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/g,
    severity: "high" as const,
  },
  {
    type: "JWT Token",
    pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    severity: "medium" as const,
  },
  {
    type: "Database URL",
    pattern: /(?:postgres|mysql|mongodb|redis):\/\/(?:[^:]+:[^@]+@)/g,
    severity: "critical" as const,
  },
  {
    type: "Password in URL",
    pattern: /https?:\/\/[^:\s]+:[^@\s]+@[^\s]+/g,
    severity: "critical" as const,
  },
];

// Known vulnerable dependency patterns
const VULNERABLE_PATTERNS = [
  {
    package: "lodash",
    minVersion: "4.17.0",
    maxVersion: "4.17.20",
    cve: "CVE-2020-8203",
    severity: "high" as const,
    description: "Prototype pollution vulnerability",
  },
  {
    package: "minimist",
    minVersion: "0.0.0",
    maxVersion: "1.2.5",
    cve: "CVE-2020-7598",
    severity: "high" as const,
    description: "Prototype pollution vulnerability",
  },
  {
    package: "yargs-parser",
    minVersion: "0.0.0",
    maxVersion: "13.1.1",
    cve: "CVE-2020-7608",
    severity: "medium" as const,
    description: "Prototype pollution vulnerability",
  },
];

// Suspicious file patterns
const SUSPICIOUS_FILE_PATTERNS = [
  { pattern: /\.env\.local$/i, reason: "Local environment file", severity: "high" as const },
  {
    pattern: /\.env\.production$/i,
    reason: "Production environment file",
    severity: "high" as const,
  },
  {
    pattern: /\.env\.development$/i,
    reason: "Development environment file",
    severity: "medium" as const,
  },
  { pattern: /id_rsa$/i, reason: "SSH private key", severity: "high" as const },
  { pattern: /id_dsa$/i, reason: "SSH private key", severity: "high" as const },
  { pattern: /id_ecdsa$/i, reason: "SSH private key", severity: "high" as const },
  { pattern: /id_ed25519$/i, reason: "SSH private key", severity: "high" as const },
  { pattern: /\.pem$/i, reason: "Certificate or key file", severity: "medium" as const },
  { pattern: /\.p12$/i, reason: "PKCS#12 certificate", severity: "medium" as const },
  { pattern: /\.key$/i, reason: "Key file", severity: "medium" as const },
  { pattern: /credentials\.json$/i, reason: "Credentials file", severity: "high" as const },
  { pattern: /secrets?\.json$/i, reason: "Secrets file", severity: "high" as const },
  { pattern: /secrets?\.ya?ml$/i, reason: "Secrets file", severity: "high" as const },
  { pattern: /passwords?\.txt$/i, reason: "Passwords file", severity: "high" as const },
  { pattern: /\.htpasswd$/i, reason: "Apache password file", severity: "high" as const },
];

// Files to skip during scanning
const SKIP_PATHS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".vercel",
  ".turbo",
  ".cache",
]);

export class RalphSecurityScanner implements SecurityScanner {
  async scanRepository(repoPath: string): Promise<SecurityReport> {
    log.info(`Scanning repository at ${repoPath}`);

    const vulnerabilities = await this.scanDependencies(repoPath);
    const secrets = await this.scanSecrets(repoPath);
    const suspiciousFiles = await this.scanSuspiciousFiles(repoPath);

    const report: SecurityReport = {
      vulnerabilities,
      secrets,
      suspiciousFiles,
      scannedAt: new Date(),
    };

    // Log summary
    const critical =
      vulnerabilities.filter((v) => v.severity === "critical").length +
      secrets.filter((s) => s.severity === "critical").length;

    const high =
      vulnerabilities.filter((v) => v.severity === "high").length +
      secrets.filter((s) => s.severity === "high").length +
      suspiciousFiles.filter((f) => f.severity === "high").length;

    log.info(`Security scan complete: ${critical} critical, ${high} high severity issues found`);

    return report;
  }

  async scanDependencies(repoPath: string): Promise<Vulnerability[]> {
    log.info(`Scanning dependencies at ${repoPath}`);

    const vulnerabilities: Vulnerability[] = [];

    // Scan package.json
    const packageJsonPath = join(repoPath, "package.json");
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

      // Scan dependencies
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      for (const [pkg, version] of Object.entries(deps)) {
        const cleanVersion = String(version).replace(/^[\^~]/, "");

        for (const vuln of VULNERABLE_PATTERNS) {
          if (pkg === vuln.package) {
            if (this.versionInRange(cleanVersion, vuln.minVersion, vuln.maxVersion)) {
              vulnerabilities.push({
                id: vuln.cve,
                severity: vuln.severity,
                package: pkg,
                version: cleanVersion,
                fixedIn: vuln.maxVersion,
                description: vuln.description,
                cve: vuln.cve,
                location: packageJsonPath,
              });
            }
          }
        }
      }
    } catch (err) {
      log.warn(`Could not read package.json`, { error: String(err) });
    }

    return vulnerabilities;
  }

  async scanSecrets(repoPath: string): Promise<Secret[]> {
    log.info(`Scanning for secrets at ${repoPath}`);

    const secrets: Secret[] = [];
    const files = await this.getAllFiles(repoPath);

    for (const file of files) {
      // Skip binary files and certain extensions
      if (this.isBinaryFile(file)) {
        continue;
      }

      try {
        const content = await readFile(file, "utf8");
        const lines = content.split("\n");

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];

          for (const pattern of SECRET_PATTERNS) {
            const matches = line.matchAll(pattern.pattern);

            for (const match of matches) {
              // Filter false positives
              if (this.isFalsePositive(match[0], line)) {
                continue;
              }

              secrets.push({
                type: pattern.type,
                match: match[0],
                file: file.replace(repoPath + "/", ""),
                line: lineNum + 1,
                severity: pattern.severity,
              });
            }
          }
        }
      } catch (err) {
        // Skip files that can't be read
        log.debug(`Could not read file ${file}`, { error: String(err) });
      }
    }

    return secrets;
  }

  private async scanSuspiciousFiles(repoPath: string): Promise<SuspiciousFile[]> {
    log.info(`Scanning for suspicious files at ${repoPath}`);

    const suspicious: SuspiciousFile[] = [];
    const files = await this.getAllFiles(repoPath);

    for (const file of files) {
      const basename = file.split("/").pop() || "";

      for (const pattern of SUSPICIOUS_FILE_PATTERNS) {
        if (pattern.pattern.test(basename)) {
          suspicious.push({
            path: file.replace(repoPath + "/", ""),
            reason: pattern.reason,
            severity: pattern.severity,
          });
        }
      }
    }

    return suspicious;
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip ignored paths
        if (SKIP_PATHS.has(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          files.push(...(await this.getAllFiles(fullPath)));
        } else {
          files.push(fullPath);
        }
      }
    } catch (err) {
      log.debug(`Could not read directory ${dir}`, { error: String(err) });
    }

    return files;
  }

  private isBinaryFile(file: string): boolean {
    const binaryExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".ico",
      ".svg",
      ".pdf",
      ".zip",
      ".tar",
      ".gz",
      ".bz2",
      ".7z",
      ".exe",
      ".dll",
      ".so",
      ".dylib",
      ".woff",
      ".woff2",
      ".ttf",
      ".eot",
      ".otf",
      ".mp3",
      ".mp4",
      ".avi",
      ".mov",
      ".webm",
      ".wasm",
      ".o",
      ".a",
    ];

    const ext = extname(file).toLowerCase();
    return binaryExtensions.includes(ext);
  }

  private isFalsePositive(match: string, line: string): boolean {
    // Skip matches in comments
    if (
      line.trim().startsWith("//") ||
      line.trim().startsWith("#") ||
      line.trim().startsWith("*") ||
      line.trim().startsWith("<!--")
    ) {
      return true;
    }

    // Skip example/test values
    if (match.includes("example") || match.includes("test") || match.includes("dummy")) {
      return true;
    }

    // Skip placeholder values
    if (match.includes("YOUR_") || match.includes("XXX") || match.includes("***")) {
      return true;
    }

    return false;
  }

  private versionInRange(version: string, min: string, max: string): boolean {
    const vParts = version.split(".").map(Number);
    const minParts = min.split(".").map(Number);
    const maxParts = max.split(".").map(Number);

    // Compare with min
    for (let i = 0; i < Math.max(vParts.length, minParts.length); i++) {
      const v = vParts[i] || 0;
      const m = minParts[i] || 0;
      if (v < m) {
        return false;
      }
      if (v > m) {
        break;
      }
    }

    // Compare with max
    for (let i = 0; i < Math.max(vParts.length, maxParts.length); i++) {
      const v = vParts[i] || 0;
      const m = maxParts[i] || 0;
      if (v > m) {
        return false;
      }
      if (v < m) {
        break;
      }
    }

    return true;
  }
}
