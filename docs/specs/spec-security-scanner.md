# Spec: Security Scanner Backend

## 🎯 Objetivo
Criar backend completo de scanner de segurança para substituir o placeholder atual por funcionalidade real.

## 📋 Estado Atual
- ✅ UI placeholder existe (109 linhas) - mostra score falso
- ❌ Backend não existe (não há src/gateway/server-methods/security.ts)
- ❌ Sem scanner real de vulnerabilidades
- ❌ Sem detecção de secrets

## 🏗️ Arquitetura

```
src/
├── gateway/server-methods/security.ts    # Handlers RPC (NOVO)
├── services/security/
│   ├── scanner.ts                        # Scanner principal
│   ├── npm-audit.ts                      # npm audit wrapper
│   ├── secret-detector.ts                # Detecção de secrets
│   └── config-checker.ts                 # Verificação de configs
└── config/security-rules.ts              # Regras de segurança
```

## 🔧 Implementação Backend

### 1. Scanner Principal (src/services/security/scanner.ts)

```typescript
interface SecurityScanResult {
  timestamp: string;
  score: number;              // 0-100
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

interface Vulnerability {
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

class SecurityScanner {
  async runFullScan(): Promise<SecurityScanResult> {
    const timestamp = new Date().toISOString();
    
    // Rodar todos os scanners em paralelo
    const [
      npmVulns,
      secretFindings,
      configIssues,
    ] = await Promise.all([
      this.scanNpmDependencies(),
      this.scanSecrets(),
      this.scanConfigurations(),
    ]);
    
    const vulnerabilities = [
      ...npmVulns,
      ...configIssues,
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
      const { stdout } = await execAsync("npm audit --json");
      const audit = JSON.parse(stdout);
      
      return Object.entries(audit.vulnerabilities || {}).map(([pkg, info]: [string, any]) => ({
        id: `npm-${info.via?.[0]?.source || pkg}`,
        title: `${pkg} - ${info.severity} vulnerability`,
        description: info.via?.[0]?.title || "Unknown vulnerability",
        severity: info.severity,
        category: "dependency",
        recommendation: `Run: npm audit fix`,
        autoFixable: info.fixAvailable?.length > 0,
        fixCommand: info.fixAvailable ? `npm install ${pkg}@${info.fixAvailable}` : undefined,
      }));
    } catch (err) {
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
        severity: "critical",
      },
      {
        name: "Private Key",
        pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/gi,
        severity: "critical",
      },
      {
        name: "Password",
        pattern: /['"`](password|passwd|pwd)['"`]\s*[:=]\s*['"`]([^'"`\s]+)['"`]/gi,
        severity: "high",
      },
      {
        name: "Token",
        pattern: /['"`](token|auth_token|access_token)['"`]\s*[:=]\s*['"`]([a-zA-Z0-9_-]{20,})['"`]/gi,
        severity: "critical",
      },
      {
        name: "AWS Access Key",
        pattern: /AKIA[0-9A-Z]{16}/g,
        severity: "critical",
      },
      {
        name: "GitHub Token",
        pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
        severity: "critical",
      },
    ];
    
    // Arquivos a verificar
    const files = await glob([
      "src/**/*.ts",
      "src/**/*.js",
      "config/**/*.{ts,js,json,yaml,yml}",
      ".env*",
      "!node_modules/**",
    ]);
    
    for (const file of files) {
      try {
        const content = await readFile(file, "utf-8");
        const lines = content.split("\n");
        
        for (let i = 0; i < lines.length; i++) {
          for (const { name, pattern, severity } of patterns) {
            pattern.lastIndex = 0;  // Reset regex
            if (pattern.test(lines[i])) {
              findings.push({
                id: `secret-${hashCode(file + i)}`,
                type: name,
                file,
                line: i + 1,
                severity,
                snippet: lines[i].trim().substring(0, 100),
                recommendation: "Move to environment variables or secrets manager",
              });
            }
          }
        }
      } catch (err) {
        // Skip files that can't be read
      }
    }
    
    return findings;
  }
  
  private async scanConfigurations(): Promise<Vulnerability[]> {
    const issues: Vulnerability[] = [];
    const config = loadConfig();
    
    // Verificar configurações inseguras
    
    // 1. Verificar se gateway.controlUi.allowInsecureAuth está true
    if (config.gateway?.controlUi?.allowInsecureAuth) {
      issues.push({
        id: "config-insecure-auth",
        title: "Insecure auth enabled",
        description: "gateway.controlUi.allowInsecureAuth is set to true. This allows authentication over HTTP.",
        severity: "high",
        category: "config",
        recommendation: "Set gateway.controlUi.allowInsecureAuth to false and use HTTPS",
        autoFixable: false,
      });
    }
    
    // 2. Verificar se há tokens no config
    const configStr = JSON.stringify(config);
    if (/OPENCLAW_GATEWAY_TOKEN|api[_-]?key|token/i.test(configStr)) {
      issues.push({
        id: "config-hardcoded-secrets",
        title: "Potential hardcoded secrets in config",
        description: "Config file may contain hardcoded tokens or API keys",
        severity: "high",
        category: "config",
        recommendation: "Use environment variables for secrets",
        autoFixable: false,
      });
    }
    
    // 3. Verificar permissões de arquivos sensíveis
    const sensitiveFiles = [
      "~/.openclaw/config.json",
      "~/.openclaw/credentials/*",
    ];
    
    for (const file of sensitiveFiles) {
      try {
        const stats = await stat(file);
        // Verificar se arquivo é readable por others
        if (stats.mode & 0o044) {
          issues.push({
            id: `config-perms-${hashCode(file)}`,
            title: `Insecure file permissions: ${file}`,
            description: "File is readable by other users",
            severity: "medium",
            category: "permission",
            file,
            recommendation: `Run: chmod 600 ${file}`,
            autoFixable: true,
            fixCommand: `chmod 600 ${file}`,
          });
        }
      } catch {
        // File doesn't exist, skip
      }
    }
    
    return issues;
  }
  
  private calculateScore(vulns: Vulnerability[], secrets: SecretFinding[]): number {
    let score = 100;
    
    // Deduzir por vulnerabilidades
    for (const v of vulns) {
      switch (v.severity) {
        case "critical": score -= 15; break;
        case "high": score -= 10; break;
        case "medium": score -= 5; break;
        case "low": score -= 2; break;
        case "info": score -= 0; break;
      }
    }
    
    // Deduzir por secrets expostos
    for (const s of secrets) {
      switch (s.severity) {
        case "critical": score -= 20; break;
        case "high": score -= 10; break;
      }
    }
    
    return Math.max(0, score);
  }
  
  private scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }
  
  private calculateSummary(vulns: Vulnerability[]) {
    return {
      critical: vulns.filter(v => v.severity === "critical").length,
      high: vulns.filter(v => v.severity === "high").length,
      medium: vulns.filter(v => v.severity === "medium").length,
      low: vulns.filter(v => v.severity === "low").length,
      info: vulns.filter(v => v.severity === "info").length,
    };
  }
}
```

### 2. Gateway Handlers (src/gateway/server-methods/security.ts)

```typescript
import { SecurityScanner } from "../../services/security/scanner.js";

const scanner = new SecurityScanner();
let lastScan: SecurityScanResult | null = null;

export const securityHandlers: GatewayRequestHandlers = {
  "security.status": async ({ respond }) => {
    try {
      // Retornar último scan ou fazer um scan rápido
      if (!lastScan) {
        lastScan = await scanner.runFullScan();
      }
      
      respond(true, {
        score: lastScan.score,
        grade: lastScan.grade,
        lastScan: lastScan.timestamp,
        summary: lastScan.summary,
        scanInProgress: false,
      });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to get security status: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "security.scan": async ({ respond }) => {
    try {
      lastScan = await scanner.runFullScan();
      
      respond(true, {
        success: true,
        message: "Security scan completed",
        result: lastScan,
      });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to run security scan: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "security.vulnerabilities": async ({ params, respond }) => {
    const { severity, category } = params;
    
    try {
      if (!lastScan) {
        lastScan = await scanner.runFullScan();
      }
      
      let vulns = lastScan.vulnerabilities;
      
      if (severity) {
        vulns = vulns.filter(v => v.severity === severity);
      }
      
      if (category) {
        vulns = vulns.filter(v => v.category === category);
      }
      
      respond(true, { vulnerabilities: vulns });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to get vulnerabilities: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "security.secrets": async ({ respond }) => {
    try {
      if (!lastScan) {
        lastScan = await scanner.runFullScan();
      }
      
      respond(true, { secrets: lastScan.secrets });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to get secrets: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "security.fix": async ({ params, respond }) => {
    const { vulnerabilityId } = params;
    
    try {
      if (!lastScan) {
        return respond(false, undefined, errorShape(
          ErrorCodes.INVALID_PARAMS,
          "No scan data available. Run a scan first."
        ));
      }
      
      const vuln = lastScan.vulnerabilities.find(v => v.id === vulnerabilityId);
      if (!vuln) {
        return respond(false, undefined, errorShape(
          ErrorCodes.NOT_FOUND,
          "Vulnerability not found"
        ));
      }
      
      if (!vuln.autoFixable || !vuln.fixCommand) {
        return respond(false, undefined, errorShape(
          ErrorCodes.INVALID_PARAMS,
          "This vulnerability cannot be auto-fixed"
        ));
      }
      
      // Executar comando de fix
      await execAsync(vuln.fixCommand);
      
      // Re-scan
      lastScan = await scanner.runFullScan();
      
      respond(true, {
        success: true,
        message: `Fixed vulnerability: ${vuln.title}`,
      });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to fix vulnerability: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
};
```

## 🎨 UI Improvements

### 1. Score Card (ui/src/ui/views/security.ts)

```typescript
function renderScoreCard(state: AppViewState) {
  const status = state.securityStatus as SecurityStatus | null;
  
  if (!status) {
    return html`<div class="loading">Loading security status...</div>`;
  }
  
  const gradeColors: Record<string, string> = {
    A: "#22c55e",  // Green
    B: "#84cc16",  // Lime
    C: "#eab308",  // Yellow
    D: "#f97316",  // Orange
    F: "#ef4444",  // Red
  };
  
  return html`
    <div class="security-score-card">
      <div class="score-circle" style="--score-color: ${gradeColors[status.grade]}">
        <span class="grade">${status.grade}</span>
        <span class="score">${status.score}/100</span>
      </div>
      
      <div class="score-summary">
        <div class="summary-row">
          <span class="severity critical">${status.summary.critical} Critical</span>
          <span class="severity high">${status.summary.high} High</span>
        </div>
        <div class="summary-row">
          <span class="severity medium">${status.summary.medium} Medium</span>
          <span class="severity low">${status.summary.low} Low</span>
        </div>
      </div>
      
      <div class="last-scan">
        Last scan: ${status.lastScan ? formatTimeAgo(status.lastScan) : "Never"}
      </div>
      
      <button 
        class="btn-primary ${state.securityScanning ? 'loading' : ''}"
        @click="${() => state.handleSecurityScan()}"
        ?disabled="${state.securityScanning}"
      >
        ${state.securityScanning ? 'Scanning...' : 'Run Security Scan'}
      </button>
    </div>
  `;
}
```

### 2. Vulnerabilities List

```typescript
function renderVulnerabilities(state: AppViewState) {
  const vulns = state.securityVulnerabilities || [];
  
  if (vulns.length === 0) {
    return html`
      <div class="empty-state">
        ✅ No vulnerabilities found!
      </div>
    `;
  }
  
  return html`
    <div class="vulnerabilities-list">
      <h3>Vulnerabilities (${vulns.length})</h3>
      
      ${vulns.map(vuln => html`
        <div class="vulnerability-card severity-${vuln.severity}">
          <div class="vuln-header">
            <span class="severity-badge ${vuln.severity}">${vuln.severity}</span>
            <span class="category-badge">${vuln.category}</span>
          </div>
          
          <h4>${vuln.title}</h4>
          <p>${vuln.description}</p>
          
          ${vuln.file ? html`
            <div class="vuln-location">
              📁 ${vuln.file}${vuln.line ? `:${vuln.line}` : ''}
            </div>
          ` : nothing}
          
          <div class="vuln-recommendation"
            <strong>Recommendation:</strong> ${vuln.recommendation}
          </div>
          
          ${vuln.autoFixable ? html`
            <button 
              class="btn-secondary"
              @click="${() => state.handleSecurityFixVulnerability(vuln.id)}"
            >
              🔧 Auto-fix
            </button>
          ` : nothing}
        </div>
      `)}
    </div>
  `;
}
```

### 3. Secrets Panel

```typescript
function renderSecretsPanel(state: AppViewState) {
  const secrets = state.securitySecrets || [];
  
  if (secrets.length === 0) {
    return html`<div class="empty-state">🔒 No secrets detected</div>`;
  }
  
  return html`
    <div class="secrets-panel">
      <h3>⚠️ Exposed Secrets (${secrets.length})</h3>
      
      ${secrets.map(secret => html`
        <div class="secret-card severity-${secret.severity}">
          <div class="secret-header">
            <span class="secret-type">${secret.type}</span>
            <span class="severity-badge ${secret.severity}">${secret.severity}</span>
          </div>
          
          <div class="secret-location">
            📁 ${secret.file}:${secret.line}
          </div>
          
          <code class="secret-snippet">${secret.snippet}</code>
          
          <div class="secret-recommendation"
            <strong>Action Required:</strong> ${secret.recommendation}
          </div>
        </div>
      `)}
    </div>
  `;
}
```

## 📦 Dependências

```json
{
  "dependencies": {
    "glob": "^10.3.0"
  }
}
```

## ✅ Acceptance Criteria

- [ ] Criar arquivo `src/gateway/server-methods/security.ts`
- [ ] Implementar scanner de npm audit
- [ ] Implementar detector de secrets
- [ ] Implementar checker de configs
- [ ] Calcular score e grade (A-F)
- [ ] UI mostrar score real com cor por grade
- [ ] Listar vulnerabilidades com severidade
- [ ] Listar secrets expostos
- [ ] Permitir auto-fix quando possível
- [ ] Botão "Run Scan" funcionando
- [ ] Registrar handler em `server-methods.ts`

## 🚀 Testing

```bash
# Testar scanner
curl -X POST http://localhost:18789/api \
  -H "Content-Type: application/json" \
  -d '{"method": "security.scan"}'

# Verificar vulnerabilidades
curl -X POST http://localhost:18789/api \
  -H "Content-Type: application/json" \
  -d '{"method": "security.vulnerabilities"}'
```
