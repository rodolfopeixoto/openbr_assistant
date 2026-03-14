# SPEC C3: Ralph Loop com Multi-Container, Multi-Git, Multi-Storage

## 1. VISÃO GERAL

Sistema completo de desenvolvimento autônomo (Ralph Loop) com:
- **Múltiplos engines de container**: Docker, Podman, Apple Container (macOS)
- **Múltiplos Git providers**: GitHub, GitLab, Bitbucket
- **Múltiplos storage backends**: Local, MinIO, S3, Google Drive
- **Sistema de backup** integrado
- **Sandboxing e segurança** avançada
- **Garbage Collection** inteligente de containers

## 2. ARQUITETURA DE CONTAINERS

### 2.1 Container Engine Abstraction

```typescript
interface ContainerEngine {
  name: 'docker' | 'podman' | 'apple-container';
  version: string;
  isAvailable(): Promise<boolean>;
  createContainer(config: ContainerConfig): Promise<Container>;
  listContainers(): Promise<Container[]>;
  removeContainer(id: string): Promise<void>;
  getStats(id: string): Promise<ContainerStats>;
  exec(id: string, command: string[]): Promise<ExecResult>;
}

interface ContainerConfig {
  image: string;
  name: string;
  env: Record<string, string>;
  volumes: VolumeMount[];
  resources: ResourceLimits;
  network?: string;
  sandbox: SandboxConfig;
}

interface SandboxConfig {
  readOnlyRoot: boolean;
  noNewPrivileges: boolean;
  seccompProfile: string;
  appArmorProfile?: string;
  dropCapabilities: string[];
  addCapabilities: string[];
  user: string; // 'ralph' (non-root)
}
```

### 2.2 Suporte Multi-Engine

**Docker (Linux/Windows/macOS)**
- Padrão para Linux/Windows
- Suporte a Docker Desktop no macOS
- DIND (Docker-in-Docker) para builds

**Podman (Linux)**
- Rootless containers por padrão
- Melhor segurança (não requer daemon)
- Compatível com Docker CLI

**Apple Container (macOS Apple Silicon)**
- VMs leves usando Virtualization.framework
- Otimizado para Apple Silicon
- OCI-compatible images
- Comando: `container system start/stop`

```typescript
class AppleContainerEngine implements ContainerEngine {
  async isAvailable(): Promise<boolean> {
    // Verifica se está no macOS com Apple Silicon
    if (platform() !== 'darwin') return false;
    if (process.arch !== 'arm64') return false;
    
    // Verifica se container está instalado
    try {
      await execSync('which container');
      return true;
    } catch {
      return false;
    }
  }
  
  async createContainer(config: ContainerConfig): Promise<Container> {
    // Converte para formato do Apple Container
    const containerfile = this.generateContainerfile(config);
    // Executa: container build + container run
  }
}
```

### 2.3 Garbage Collector Inteligente

```typescript
interface GCPolicy {
  maxIdleTime: number;        // 30 minutos
  maxContainersPerUser: number; // 5
  maxContainersPerProject: number; // 3
  maxDiskUsage: number;       // 50GB
  maxMemoryUsage: number;     // 16GB
  preserveFailed: number;     // 24 horas
  backupBeforeDelete: boolean;
}

class ContainerGC {
  async runGC(): Promise<GCReport> {
    const containers = await this.listAllContainers();
    const report: GCReport = { removed: [], archived: [], errors: [] };
    
    for (const container of containers) {
      const shouldRemove = await this.shouldRemove(container);
      if (shouldRemove) {
        if (container.hasData) {
          await this.backupAndArchive(container);
          report.archived.push(container.id);
        }
        await this.remove(container);
        report.removed.push(container.id);
      }
    }
    
    return report;
  }
  
  private async shouldRemove(container: Container): Promise<boolean> {
    // Remove se:
    // 1. Ocioso por mais que maxIdleTime
    // 2. Excedeu limite de containers por usuário
    // 3. Run completado e passou tempo de preservação
    // 4. Disco cheio e este é o mais antigo
    
    if (container.status === 'running') return false;
    
    const idleTime = Date.now() - container.lastActivity;
    if (idleTime > this.policy.maxIdleTime) return true;
    
    if (container.runStatus === 'completed') {
      const completedTime = Date.now() - container.completedAt;
      if (completedTime > this.policy.preserveCompleted) return true;
    }
    
    return false;
  }
}
```

## 3. SISTEMA MULTI-GIT

### 3.1 Git Provider Abstraction

```typescript
interface GitProvider {
  name: 'github' | 'gitlab' | 'bitbucket';
  authenticate(credentials: Credentials): Promise<AuthToken>;
  createPR(params: CreatePRParams): Promise<PullRequest>;
  getPR(id: string): Promise<PullRequest>;
  mergePR(id: string): Promise<void>;
  createBranch(name: string, base: string): Promise<void>;
  getBranches(): Promise<string[]>;
  getCommits(branch: string): Promise<Commit[]>;
  pushChanges(branch: string): Promise<void>;
  runCI(pipeline: string): Promise<CIResult>;
}

interface CreatePRParams {
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
  labels?: string[];
  reviewers?: string[];
}

interface PullRequest {
  id: string;
  number: number;
  title: string;
  status: 'open' | 'closed' | 'merged';
  url: string;
  ciStatus: 'pending' | 'success' | 'failure';
}
```

### 3.2 Implementações

**GitHub**
```typescript
class GitHubProvider implements GitProvider {
  private octokit: Octokit;
  
  async authenticate(creds: Credentials): Promise<AuthToken> {
    // OAuth2 ou Personal Access Token
    if (creds.type === 'oauth') {
      return this.oauthFlow(creds);
    }
    return { token: creds.token, type: 'pat' };
  }
  
  async createPR(params: CreatePRParams): Promise<PullRequest> {
    const { data } = await this.octokit.rest.pulls.create({
      owner: this.repo.owner,
      repo: this.repo.name,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
      draft: params.draft,
    });
    
    // Add labels e reviewers
    if (params.labels) {
      await this.octokit.rest.issues.addLabels({
        owner: this.repo.owner,
        repo: this.repo.name,
        issue_number: data.number,
        labels: params.labels,
      });
    }
    
    return this.mapPR(data);
  }
}
```

**GitLab**
```typescript
class GitLabProvider implements GitProvider {
  private api: Gitlab;
  
  async createPR(params: CreatePRParams): Promise<PullRequest> {
    // GitLab chama de Merge Request
    const mr = await this.api.MergeRequests.create(
      this.projectId,
      params.head,
      params.base,
      params.title,
      {
        description: params.body,
        labels: params.labels?.join(','),
      }
    );
    
    return this.mapMR(mr);
  }
}
```

**Bitbucket**
```typescript
class BitbucketProvider implements GitProvider {
  private client: Bitbucket;
  
  async createPR(params: CreatePRParams): Promise<PullRequest> {
    const { data } = await this.client.repositories.createPullRequest({
      workspace: this.workspace,
      repo_slug: this.repo,
      _body: {
        title: params.title,
        description: params.body,
        source: { branch: { name: params.head } },
        destination: { branch: { name: params.base } },
      },
    });
    
    return this.mapPR(data);
  }
}
```

### 3.3 Autenticação OpenClaw

Usa as credenciais já configuradas no OpenClaw:

```typescript
class GitAuthManager {
  async getProvider(provider: string): Promise<GitProvider> {
    const creds = await this.getCredentialsFromOpenClaw(provider);
    
    switch (provider) {
      case 'github':
        return new GitHubProvider(creds);
      case 'gitlab':
        return new GitLabProvider(creds);
      case 'bitbucket':
        return new BitbucketProvider(creds);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
  
  private async getCredentialsFromOpenClaw(provider: string): Promise<Credentials> {
    // Busca do sistema de credenciais do OpenClaw
    const config = await loadConfig();
    return config.providers[provider].auth;
  }
}
```

## 4. SISTEMA MULTI-STORAGE

### 4.1 Storage Backend Abstraction

```typescript
interface StorageBackend {
  name: string;
  type: 'local' | 's3' | 'minio' | 'gcs' | 'gdrive';
  
  // Operações básicas
  upload(key: string, data: Buffer | Stream): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
  
  // Metadados
  getMetadata(key: string): Promise<StorageMetadata>;
  setMetadata(key: string, meta: StorageMetadata): Promise<void>;
  
  // URL assinada (para acesso temporário)
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

interface StorageMetadata {
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  contentType: string;
  checksum: string;
  tags: Record<string, string>;
}
```

### 4.2 Implementações

**Local Storage**
```typescript
class LocalStorage implements StorageBackend {
  constructor(private basePath: string) {}
  
  async upload(key: string, data: Buffer): Promise<void> {
    const path = join(this.basePath, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }
  
  async download(key: string): Promise<Buffer> {
    return readFile(join(this.basePath, key));
  }
}
```

**S3 / MinIO**
```typescript
class S3Storage implements StorageBackend {
  private client: S3Client;
  
  constructor(config: S3Config) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint, // Para MinIO
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: config.forcePathStyle, // true para MinIO
    });
    this.bucket = config.bucket;
  }
  
  async upload(key: string, data: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
    }));
  }
}
```

**Google Drive**
```typescript
class GoogleDriveStorage implements StorageBackend {
  private drive: drive_v3.Drive;
  
  async upload(key: string, data: Buffer): Promise<void> {
    // Cria ou atualiza arquivo
    const fileMetadata = {
      name: basename(key),
      parents: [await this.getOrCreateFolder(dirname(key))],
    };
    
    const media = {
      mimeType: 'application/octet-stream',
      body: Readable.from(data),
    };
    
    await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });
  }
}
```

### 4.3 Storage Manager

```typescript
class StorageManager {
  private backends: Map<string, StorageBackend> = new Map();
  private defaultBackend: string;
  
  async initialize(config: StorageConfig): Promise<void> {
    for (const [name, backendConfig] of Object.entries(config.backends)) {
      const backend = await this.createBackend(backendConfig);
      this.backends.set(name, backend);
    }
    this.defaultBackend = config.default;
  }
  
  async backupRun(runId: string, data: RunBackupData): Promise<void> {
    const key = `backups/runs/${runId}/${Date.now()}.tar.gz`;
    const buffer = await this.compress(data);
    
    // Salva no backend padrão + replicação se configurado
    await this.getBackend().upload(key, buffer);
    
    if (this.replicationEnabled) {
      for (const replica of this.replicationTargets) {
        await this.getBackend(replica).upload(key, buffer);
      }
    }
  }
  
  async restoreRun(runId: string, timestamp?: number): Promise<RunBackupData> {
    const key = await this.findBackupKey(runId, timestamp);
    const buffer = await this.getBackend().download(key);
    return this.decompress(buffer);
  }
}
```

## 5. SISTEMA DE BACKUP

### 5.1 Estratégia de Backup

```typescript
interface BackupConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  retention: {
    hourly: number;   // manter últimas N horas
    daily: number;    // manter últimos N dias
    weekly: number;   // manter últimas N semanas
  };
  backends: string[]; // Quais storage backends usar
  compression: 'gzip' | 'zstd' | 'none';
  encryption: {
    enabled: boolean;
    keyId: string;
  };
}

interface BackupJob {
  id: string;
  type: 'full' | 'incremental';
  runId?: string;
  startedAt: Date;
  completedAt?: Date;
  size: number;
  checksum: string;
  location: string[];
}

class BackupService {
  async createBackup(type: 'full' | 'incremental', runId?: string): Promise<BackupJob> {
    const job: BackupJob = {
      id: generateId(),
      type,
      runId,
      startedAt: new Date(),
      size: 0,
      checksum: '',
      location: [],
    };
    
    // Coleta dados
    const data = await this.collectBackupData(runId);
    
    // Comprime
    const compressed = await this.compress(data);
    
    // Criptografa se necessário
    const encrypted = this.config.encryption.enabled 
      ? await this.encrypt(compressed)
      : compressed;
    
    // Salva em todos os backends configurados
    for (const backendName of this.config.backends) {
      const key = `backups/${type}/${runId || 'full'}/${job.id}.tar.gz`;
      await this.storage.getBackend(backendName).upload(key, encrypted);
      job.location.push(`${backendName}:${key}`);
    }
    
    job.completedAt = new Date();
    job.size = encrypted.length;
    job.checksum = computeChecksum(encrypted);
    
    await this.saveBackupMetadata(job);
    return job;
  }
  
  async restoreFromBackup(jobId: string): Promise<RestoreResult> {
    const job = await this.getBackupJob(jobId);
    
    // Tenta cada location até conseguir
    for (const location of job.location) {
      try {
        const [backendName, key] = location.split(':', 2);
        const encrypted = await this.storage.getBackend(backendName).download(key);
        
        const compressed = job.encryption?.enabled
          ? await this.decrypt(encrypted)
          : encrypted;
        
        const data = await this.decompress(compressed);
        await this.restoreData(data);
        
        return { success: true, restoredFrom: location };
      } catch (err) {
        log.warn(`Failed to restore from ${location}:`, err);
        continue;
      }
    }
    
    throw new Error('All backup locations failed');
  }
}
```

### 5.2 O que é Backupeado

```typescript
interface RunBackupData {
  run: RalphRun;
  prd: PRDDocument;
  progress: string; // progress.txt
  git: {
    branch: string;
    commits: Commit[];
    diff: string;
  };
  container: {
    snapshot?: Buffer; // Se suportado pelo engine
    logs: string[];
    artifacts: Record<string, Buffer>;
  };
  workspace: Buffer; // Tar.gz do diretório de trabalho
  metadata: {
    backedUpAt: Date;
    version: string;
    engine: string;
  };
}
```

## 6. SANDBOXING E SEGURANÇA

### 6.1 Modelo de Ameaças

**Ameaças Identificadas:**
1. **Código malicioso** no repositório (supply chain attack)
2. **Resource exhaustion** (cpu, memory, disk)
3. **Network egress** (data exfiltration)
4. **Container escape** (privilege escalation)
5. **Secret leakage** (API keys in logs)

### 6.2 Sandboxing

**Linux (Docker/Podman)**
```typescript
const linuxSandbox: SandboxConfig = {
  readOnlyRoot: true,
  noNewPrivileges: true,
  seccompProfile: 'ralph-seccomp.json',
  appArmorProfile: 'ralph-default',
  dropCapabilities: [
    'ALL'
  ],
  addCapabilities: [
    'CHOWN',
    'SETGID',
    'SETUID',
  ],
  user: 'ralph:ralph', // Non-root (UID 1000)
  securityOpts: [
    'no-new-privileges:true',
    'seccomp=ralph-seccomp.json',
    'apparmor=ralph-default',
  ],
  network: {
    mode: 'bridge',
    disableOutgoing: false,
    allowedHosts: [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'registry.npmjs.org',
      'pypi.org',
    ],
  },
  resources: {
    cpu: { max: 2, shares: 1024 },
    memory: { max: '4g', swap: '0' },
    pids: { max: 100 },
    storage: { max: '10g' },
  },
};
```

**macOS (Apple Container)**
```typescript
const macOSSandbox: SandboxConfig = {
  readOnlyRoot: true,
  user: 'ralph',
  // Apple Container usa VMs isoladas por padrão
  // Configurações adicionais via Containerfile
  rosetta: false, // Não usar Rosetta (ARM64 nativo)
  // Network isolada por padrão
};
```

### 6.3 Content Security

**Scanning de Dependências**
```typescript
class SecurityScanner {
  async scanRepository(repoPath: string): Promise<SecurityReport> {
    const report: SecurityReport = {
      vulnerabilities: [],
      secrets: [],
      suspiciousFiles: [],
    };
    
    // Scan de secrets
    const secrets = await this.scanSecrets(repoPath);
    report.secrets.push(...secrets);
    
    // Scan de vulnerabilidades
    const vulns = await this.scanVulnerabilities(repoPath);
    report.vulnerabilities.push(...vulns);
    
    // Scan de arquivos suspeitos
    const files = await this.scanSuspiciousFiles(repoPath);
    report.suspiciousFiles.push(...files);
    
    return report;
  }
  
  private async scanSecrets(repoPath: string): Promise<Secret[]> {
    // Usa trufflehog ou similar
    const result = await exec(`trufflehog filesystem ${repoPath} --json`);
    return this.parseTrufflehogOutput(result);
  }
  
  private async scanVulnerabilities(repoPath: string): Promise<Vulnerability[]> {
    // npm audit, pip-audit, etc.
    const audits = await Promise.all([
      this.runNpmAudit(repoPath),
      this.runPipAudit(repoPath),
    ]);
    return audits.flat();
  }
}
```

### 6.4 Secret Management

```typescript
class SecretManager {
  // Nunca expõe secrets no container
  async injectSecrets(env: Record<string, string>): Promise<Record<string, string>> {
    const injected: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(env)) {
      if (this.isSecretReference(value)) {
        // Busca do vault
        injected[key] = await this.resolveSecret(value);
      } else {
        injected[key] = value;
      }
    }
    
    return injected;
  }
  
  // Mascara secrets em logs
  maskSecrets(text: string): string {
    for (const pattern of this.secretPatterns) {
      text = text.replace(pattern, '***REDACTED***');
    }
    return text;
  }
}
```

### 6.5 Network Policies

```typescript
interface NetworkPolicy {
  defaultDeny: boolean;
  egress: {
    allowed: string[]; // Domínios/IPs permitidos
    blocked: string[]; // Domínios/IPs bloqueados
  };
  dns: {
    servers: string[];
    fallback: boolean;
  };
}

const defaultNetworkPolicy: NetworkPolicy = {
  defaultDeny: true,
  egress: {
    allowed: [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'raw.githubusercontent.com',
      'registry.npmjs.org',
      'pypi.org',
      'pypi.python.org',
      'files.pythonhosted.org',
      'crates.io',
      'index.crates.io',
      'repo.maven.apache.org',
      'plugins.gradle.org',
      'packages.gitlab.com',
    ],
    blocked: [
      '169.254.169.254', // AWS metadata
      'metadata.google.internal',
    ],
  },
  dns: {
    servers: ['1.1.1.1', '8.8.8.8'],
    fallback: false,
  },
};
```

## 7. IMPLEMENTAÇÃO PASSO A PASSO

### Fase 1: Core Architecture (Semanas 1-2)
1. Container Engine Abstraction
2. Docker engine implementation
3. Container GC service
4. Basic Ralph service

### Fase 2: Multi-Git Support (Semana 3)
1. Git Provider Abstraction
2. GitHub implementation
3. GitLab implementation
4. Bitbucket implementation

### Fase 3: Multi-Storage (Semana 4)
1. Storage Backend Abstraction
2. Local/S3/MinIO implementations
3. Google Drive implementation
4. Backup service

### Fase 4: Security (Semana 5)
1. Sandboxing para Linux
2. Security scanning
3. Secret management
4. Network policies

### Fase 5: Apple Container (Semana 6)
1. Apple Container engine
2. macOS-specific optimizations
3. Testing no macOS

### Fase 6: UI & Integration (Semanas 7-8)
1. Ralph tab UI
2. Chat integration
3. Monitoring dashboard
4. E2E testing

## 8. CONFIGURAÇÃO

```json
{
  "ralph": {
    "enabled": true,
    "container": {
      "engine": "auto", // auto | docker | podman | apple-container
      "resources": {
        "cpu": "2",
        "memory": "4g",
        "storage": "10g"
      },
      "gc": {
        "enabled": true,
        "maxIdleMinutes": 30,
        "maxContainersPerUser": 5,
        "backupBeforeDelete": true
      },
      "sandbox": {
        "readOnlyRoot": true,
        "noNewPrivileges": true,
        "networkPolicy": "restricted"
      }
    },
    "git": {
      "defaultProvider": "github",
      "autoPR": true,
      "commitStyle": "conventional",
      "providers": {
        "github": { "enabled": true },
        "gitlab": { "enabled": false },
        "bitbucket": { "enabled": false }
      }
    },
    "storage": {
      "default": "local",
      "backends": {
        "local": {
          "type": "local",
          "path": "~/.openclaw/ralph/storage"
        },
        "s3": {
          "type": "s3",
          "region": "us-east-1",
          "bucket": "openclaw-ralph"
        },
        "gdrive": {
          "type": "gdrive",
          "folderId": "..."
        }
      }
    },
    "backup": {
      "enabled": true,
      "schedule": "0 */6 * * *", // A cada 6 horas
      "retention": {
        "hourly": 6,
        "daily": 7,
        "weekly": 4
      },
      "backends": ["local", "s3"]
    },
    "security": {
      "scanOnStart": true,
      "blockOnVulnerabilities": true,
      "allowedHosts": [],
      "blockedHosts": []
    }
  }
}
```

## 9. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Container Engine Abstraction
- [ ] Docker Engine
- [ ] Podman Engine
- [ ] Apple Container Engine
- [ ] Container GC
- [ ] Git Provider Abstraction
- [ ] GitHub Provider
- [ ] GitLab Provider
- [ ] Bitbucket Provider
- [ ] Storage Backend Abstraction
- [ ] Local Storage
- [ ] S3/MinIO Storage
- [ ] Google Drive Storage
- [ ] Backup Service
- [ ] Linux Sandboxing
- [ ] Security Scanner
- [ ] Secret Manager
- [ ] Network Policies
- [ ] Ralph Service Core
- [ ] PRD Manager
- [ ] Iteration Loop
- [ ] Quality Checks
- [ ] UI Tab
- [ ] Chat Integration
- [ ] Monitoring
- [ ] Documentation

## 10. PROXIMAS AÇÕES

Quer que eu comece implementando:
1. **Container Engine Abstraction + Docker** (Fase 1)
2. **Toda a Fase 1 de uma vez**
3. **Estrutura base primeiro** (interfaces, configs, tests)

O que prefere?
