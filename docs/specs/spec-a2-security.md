# Spec A2: Security System - Backend Completo

## 🎯 Objetivo
Implementar backend completo para o sistema de Security com scanner de vulnerabilidades, integração completa com a UI existente.

## 📋 Estado Atual
- **UI:** Placeholder (109 linhas) - mostra score 0, sem dados reais
- **Backend:** Não existe - TODO stubs em `app.ts`
- **Problemas:**
  - `handleSecurityLoad()` retorna dados mockados
  - `handleSecurityScan()` é só um console.log
  - Sem vulnerabilidades reais

## 🏗️ Arquitetura

### Backend
```
src/
├── gateway/server-methods/security.ts       # Handlers RPC
├── services/security/
│   ├── scanner.ts                          # Scanner principal
│   ├── analyzers/
│   │   ├── dependency-analyzer.ts          # npm audit, cargo audit
│   │   ├── secret-analyzer.ts             # Detecção de secrets
│   │   └── config-analyzer.ts             # Configurações inseguras
│   └── score-calculator.ts                # Cálculo de score
├── services/security-checks/
│   ├── npm-audit.ts
│   ├── cargo-audit.ts
│   └── secret-patterns.ts                 # Regex patterns
└── config/types.security.ts
```

### Frontend
```
ui/src/ui/
├── views/security.ts                       # ATUALIZAR
├── controllers/security.ts                 # NOVO
└── app.ts                                  # ADICIONAR handlers
```

## 🔧 Implementação Backend

### 1. Gateway Handlers

#### `security.status`
```typescript
interface SecurityStatus {
  overallScore: number;           // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  lastScanAt: string | null;      // ISO 8601
  nextScanScheduled: string | null;
  scanInProgress: boolean;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  checked: {
    dependencies: boolean;
    secrets: boolean;
    configuration: boolean;
    permissions: boolean;
  };
}

// Retorna SecurityStatus atual
```

#### `security.scan`
```typescript
interface ScanParams {
  types?: ('dependencies' | 'secrets' | 'configuration' | 'permissions')[];
  // Se vazio, scan completo
}

// Inicia scan assíncrono
// Retorna: { scanId: string, startedAt: string }
// Scan roda em background, atualiza status periodicamente
```

#### `security.vulnerabilities`
```typescript
interface VulnerabilityParams {
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status?: 'open' | 'fixed' | 'ignored';
  type?: 'dependency' | 'secret' | 'config' | 'permission';
  search?: string;
}

interface Vulnerability {
  id: string;                    // UUID
  scanId: string;                // Qual scan encontrou
  type: 'dependency' | 'secret' | 'config' | 'permission';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'open' | 'fixed' | 'ignored';
  title: string;
  description: string;
  file?: string;                 // Arquivo afetado
  line?: number;                 // Linha (se aplicável)
  column?: number;               // Coluna (se aplicável)
  snippet?: string;              // Código vulnerável
  remediation?: string;          // Como corrigir
  cveId?: string;                // CVE ID (se aplicável)
  packageName?: string;          // Package vulnerável
  packageVersion?: string;       // Versão atual
  fixedVersion?: string;         // Versão com fix
  createdAt: string;
  fixedAt?: string;
}

// Retorna: { vulnerabilities: Vulnerability[], total: number }
```

#### `security.vulnerability.get`
```typescript
// Retorna detalhes completos de uma vulnerabilidade específica
// Inclui contexto adicional, referências, etc.
```

#### `security.vulnerability.ignore`
```typescript
interface IgnoreParams {
  vulnerabilityId: string;
  reason: string;                // Por que está ignorando
  duration?: 'permanent' | '30d' | '90d';  // Default: permanent
}

// Marca vulnerabilidade como ignored
```

#### `security.vulnerability.fix`
```typescript
interface FixParams {
  vulnerabilityId: string;
  autoFix?: boolean;             // Tentar fix automático
}

// Aplica fix (se disponível)
// Retorna: { success: boolean, applied?: string, error?: string }
```

#### `security.history`
```typescript
interface HistoryParams {
  limit?: number;                // Default: 30
}

interface SecurityScan {
  id: string;
  startedAt: string;
  completedAt: string;
  duration: number;              // Segundos
  triggeredBy: 'manual' | 'scheduled' | 'startup';
  score: number;
  vulnerabilitiesFound: number;
  types: string[];
}

// Retorna histórico de scans
```

#### `security.config`
```typescript
interface SecurityConfigParams {
  autoScan?: boolean;            // Scan automático
  scanInterval?: 'daily' | 'weekly' | 'monthly';
  notifyOn?: ('critical' | 'high' | 'medium')[];
  ignorePatterns?: string[];     // Arquivos/paths para ignorar
}

// Get/Set configurações
```

### 2. Security Scanner

```typescript
// src/services/security/scanner.ts

class SecurityScanner {
  async runFullScan(): Promise<ScanResult> {
    const results = await Promise.all([
      this.scanDependencies(),
      this.scanSecrets(),
      this.scanConfiguration(),
      this.scanPermissions(),
    ]);
    
    return this.aggregateResults(results);
  }
  
  async scanDependencies(): Promise<Vulnerability[]> {
    // npm audit
    // cargo audit
    // Verificar package.json, Cargo.toml, requirements.txt
    
    const vulns: Vulnerability[] = [];
    
    // Node.js
    if (existsSync('package.json')) {
      const npmAudit = await runNpmAudit();
      vulns.push(...this.parseNpmAudit(npmAudit));
    }
    
    // Rust
    if (existsSync('Cargo.toml')) {
      const cargoAudit = await runCargoAudit();
      vulns.push(...this.parseCargoAudit(cargoAudit));
    }
    
    // Python
    if (existsSync('requirements.txt') || existsSync('pyproject.toml')) {
      // pip-audit ou safety
    }
    
    return vulns;
  }
  
  async scanSecrets(): Promise<Vulnerability[]> {
    // Scan em todos os arquivos de código
    // Patterns: API keys, tokens, passwords, private keys
    
    const patterns = [
      {
        name: 'AWS Access Key ID',
        regex: /AKIA[0-9A-Z]{16}/,
        severity: 'critical',
      },
      {
        name: 'Private Key',
        regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
        severity: 'critical',
      },
      {
        name: 'GitHub Token',
        regex: /gh[pousr]_[A-Za-z0-9_]{36,}/,
        severity: 'high',
      },
      {
        name: 'Slack Token',
        regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/,
        severity: 'high',
      },
      {
        name: 'Generic API Key',
        regex: /[aA][pP][iI]_?[kK][eE][yY][\s]*[=:]+[\s]*['""]?[a-zA-Z0-9_\-]{16,}/,
        severity: 'medium',
      },
      // ... mais patterns
    ];
    
    // Scan recursivo, ignorar node_modules, .git, etc.
  }
  
  async scanConfiguration(): Promise<Vulnerability[]> {
    const vulns: Vulnerability[] = [];
    
    // Verificar configurações inseguras em:
    // - openclaw.json
    // - .env files
    // - Docker configs
    
    // Exemplos:
    // - Senhas em texto plano
    // - DEBUG=true em produção
    // - Permissões de arquivo muito abertas
    // - SSL desabilitado
    
    return vulns;
  }
  
  async scanPermissions(): Promise<Vulnerability[]> {
    // Verificar permissões de arquivos críticos
    // - .env não deve ser world-readable
    // - Chaves privadas devem ter 0600
    
    return [];
  }
  
  calculateScore(vulnerabilities: Vulnerability[]): number {
    // Algoritmo de scoring:
    // Começa com 100
    // -10 por critical
    // -5 por high
    // -2 por medium
    // -1 por low
    // Mínimo: 0
    
    let score = 100;
    vulnerabilities.forEach(v => {
      switch (v.severity) {
        case 'critical': score -= 10; break;
        case 'high': score -= 5; break;
        case 'medium': score -= 2; break;
        case 'low': score -= 1; break;
      }
    });
    
    return Math.max(0, score);
  }
  
  getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}
```

### 3. Storage

```typescript
// SQLite schema

create table security_scans (
  id text primary key,
  started_at datetime not null,
  completed_at datetime,
  duration integer,            -- Segundos
  triggered_by text not null,  -- manual, scheduled, startup
  score integer,
  grade text,
  total_vulnerabilities integer,
  types text                   -- JSON array
);

create table security_vulnerabilities (
  id text primary key,
  scan_id text not null,
  type text not null,          -- dependency, secret, config, permission
  severity text not null,      -- critical, high, medium, low, info
  status text not null,        -- open, fixed, ignored
  title text not null,
  description text,
  file text,
  line integer,
  column integer,
  snippet text,
  remediation text,
  cve_id text,
  package_name text,
  package_version text,
  fixed_version text,
  created_at datetime not null,
  fixed_at datetime,
  ignore_reason text,
  ignore_until datetime,
  foreign key (scan_id) references security_scans(id)
);

create index idx_vuln_scan on security_vulnerabilities(scan_id);
create index idx_vuln_severity on security_vulnerabilities(severity);
create index idx_vuln_status on security_vulnerabilities(status);
create index idx_vuln_type on security_vulnerabilities(type);
```

### 4. Agendador

```typescript
// Scan automático (se habilitado)
// - Daily: Todo dia às 3am
// - Weekly: Todo domingo às 3am
// - Monthly: Primeiro dia do mês às 3am

// Também scan no startup se último scan foi há mais de 7 dias
```

## 🎨 Implementação Frontend

### Controller

```typescript
// ui/src/ui/controllers/security.ts

export interface SecurityContext {
  client: GatewayBrowserClient | null;
  connected: boolean;
  securityLoading: boolean;
  securityError: string | null;
  securityStatus: SecurityStatus | null;
  securityVulnerabilities: Vulnerability[];
  securityScanning: boolean;
  securitySelectedSeverity: string | null;
  securitySelectedType: string | null;
  securitySelectedVulnerability: Vulnerability | null;
  securityModalOpen: boolean;
}

export async function loadSecurityStatus(ctx: SecurityContext): Promise<void> {
  // Chamar security.status
}

export async function startSecurityScan(ctx: SecurityContext): Promise<void> {
  // Chamar security.scan
  // Poll status até completar
}

export async function loadVulnerabilities(ctx: SecurityContext): Promise<void> {
  // Chamar security.vulnerabilities com filtros
}

export async function ignoreVulnerability(ctx: SecurityContext, id: string, reason: string): Promise<void> {
  // Chamar security.vulnerability.ignore
}

export async function fixVulnerability(ctx: SecurityContext, id: string): Promise<void> {
  // Chamar security.vulnerability.fix
}
```

### View

```typescript
// Seguir padrão MCP/OpenCode

export function renderSecurityView(state: AppViewState) {
  return html`
    <div class="security-view">
      ${renderHeader(state)}
      ${state.securityLoading
        ? renderLoading()
        : state.securityError
        ? renderError(state.securityError, () => state.handleSecurityLoad())
        : !state.securityStatus
        ? renderEmptyState()
        : html`
            <div class="security-layout">
              ${renderScoreCard(state)}
              ${renderVulnerabilitiesList(state)}
            </div>
          `}
      ${state.securityModalOpen ? renderVulnerabilityModal(state) : nothing}
    </div>
  `;
}

function renderHeader(state: AppViewState) {
  const status = state.securityStatus;
  
  return html`
    <div class="view-header">
      <div class="header-title">
        <h1>Security</h1>
        <p class="subtitle">Vulnerability scanning and security analysis</p>
      </div>
      <div class="header-actions">
        <button @click=${() => state.handleSecurityScan()}
                ?disabled=${state.securityScanning}
                class="btn-primary">
          ${state.securityScanning 
            ? html`<span class="spinner"></span> Scanning...`
            : html`${icons.shield} Run Scan`}
        </button>
        <button @click=${() => window.location.hash = 'security-config'}
                class="btn-secondary">
          ${icons.settings} Config
        </button>
      </div>
      ${status ? html`
        <div class="header-stats">
          <div class="stat">
            <span class="value grade-${status.grade.toLowerCase()}">${status.grade}</span>
            <span class="label">Grade</span>
          </div>
          <div class="stat">
            <span class="value">${status.overallScore}</span>
            <span class="label">Score</span>
          </div>
          <div class="stat critical">
            <span class="value">${status.summary.critical}</span>
            <span class="label">Critical</span>
          </div>
          <div class="stat high">
            <span class="value">${status.summary.high}</span>
            <span class="label">High</span>
          </div>
          <div class="stat medium">
            <span class="value">${status.summary.medium}</span>
            <span class="label">Medium</span>
          </div>
        </div>
      ` : nothing}
    </div>
  `;
}

function renderScoreCard(state: AppViewState) {
  const status = state.securityStatus!;
  
  return html`
    <div class="score-card grade-${status.grade.toLowerCase()}">
      <div class="score-main">
        <div class="grade">${status.grade}</div>
        <div class="score-value">${status.overallScore}/100</div>
      </div>
      <div class="score-details">
        <div class="last-scan">
          ${status.lastScanAt 
            ? `Last scan: ${formatRelativeTime(status.lastScanAt)}`
            : 'Never scanned'}
        </div>
        <div class="checks">
          ${Object.entries(status.checked).map(([check, passed]) => html`
            <span class="check ${passed ? 'passed' : 'failed'}">
              ${passed ? icons.check : icons.x} ${check}
            </span>
          `)}
        </div>
      </div>
    </div>
  `;
}

function renderVulnerabilitiesList(state: AppViewState) {
  return html`
    <div class="vulnerabilities-section">
      <div class="section-header">
        <h2>Vulnerabilities</h2>
        <div class="filters">
          <select @change="${(e: InputEvent) => state.handleSecuritySeverityFilter((e.target as HTMLSelectElement).value)}">
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select @change="${(e: InputEvent) => state.handleSecurityTypeFilter((e.target as HTMLSelectElement).value)}">
            <option value="">All Types</option>
            <option value="dependency">Dependencies</option>
            <option value="secret">Secrets</option>
            <option value="config">Configuration</option>
          </select>
        </div>
      </div>
      
      <div class="vulnerabilities-list">
        ${state.securityVulnerabilities.map(vuln => renderVulnerabilityRow(vuln, state))}
      </div>
    </div>
  `;
}

function renderVulnerabilityRow(vuln: Vulnerability, state: AppViewState) {
  return html`
    <div class="vulnerability-row severity-${vuln.severity}" 
         @click="${() => state.handleSecurityVulnerabilityClick(vuln)}">
      <div class="severity-badge ${vuln.severity}">${vuln.severity}</div>
      <div class="vuln-info">
        <h4>${vuln.title}</h4>
        <p class="description">${vuln.description}</p>
        ${vuln.file ? html`
          <span class="file">${vuln.file}${vuln.line ? `:${vuln.line}` : ''}</span>
        ` : nothing}
      </div>
      <div class="vuln-actions">
        ${vuln.remediation ? html`
          <button @click="${(e: Event) => { e.stopPropagation(); state.handleSecurityFix(vuln.id); }}"
                  class="btn-fix">
            ${icons.check} Fix
          </button>
        ` : nothing}
        <button @click="${(e: Event) => { e.stopPropagation(); state.handleSecurityIgnore(vuln.id); }}"
                class="btn-ignore">
          ${icons.x} Ignore
        </button>
      </div>
    </div>
  `;
}
```

## 🧪 Testes

### Backend
```typescript
describe('security.scan', () => {
  it('detects vulnerable dependencies', async () => {
    // Criar package.json com vulnerabilidade conhecida
    // Rodar scan
    // Verificar se detectou
  });
  
  it('detects secrets in code', async () => {
    // Criar arquivo com API key
    // Rodar scan
    // Verificar detecção
  });
  
  it('calculates score correctly', () => {
    // Testar algoritmo de scoring
  });
});
```

## 📊 Critérios de Aceitação

- [ ] Backend: Scanner de dependências (npm audit)
- [ ] Backend: Scanner de secrets (patterns)
- [ ] Backend: Scanner de configuração
- [ ] Backend: Score calculator
- [ ] Backend: Grade (A-F)
- [ ] Backend: Scan assíncrono
- [ ] Frontend: Score card visual
- [ ] Frontend: Lista de vulnerabilidades
- [ ] Frontend: Filtros por severity/type
- [ ] Frontend: Ações (fix, ignore)
- [ ] Frontend: Modal de detalhes
- [ ] Frontend: Scan progress
- [ ] Testes: >80% coverage
- [ ] Performance: Scan completo <30s

## ⏱️ Estimativa
- Backend: 4 dias
- Frontend: 2 dias
- Testes: 1 dia
- **Total: 7 dias**
