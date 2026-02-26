/**
 * Ralph Service - Core Types and Interfaces
 * Multi-container, multi-git, multi-storage development automation
 */

// Container Engine Types
export type ContainerEngineType = "docker" | "podman" | "apple-container";

export interface ContainerEngine {
  readonly name: ContainerEngineType;
  readonly version: string;

  isAvailable(): Promise<boolean>;
  createContainer(config: ContainerConfig): Promise<Container>;
  startContainer(id: string): Promise<void>;
  stopContainer(id: string, timeout?: number): Promise<void>;
  removeContainer(id: string, force?: boolean): Promise<void>;
  listContainers(filters?: ContainerFilters): Promise<Container[]>;
  getContainer(id: string): Promise<Container | null>;
  getStats(id: string): Promise<ContainerStats>;
  exec(id: string, command: string[], options?: ExecOptions): Promise<ExecResult>;
  pullImage(image: string): Promise<void>;
}

export interface ContainerConfig {
  name: string;
  image: string;
  command?: string[];
  env: Record<string, string>;
  volumes: VolumeMount[];
  resources: ResourceLimits;
  network?: NetworkConfig;
  sandbox: SandboxConfig;
  labels?: Record<string, string>;
  workingDir?: string;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  status: "created" | "running" | "paused" | "restarting" | "removing" | "exited" | "dead";
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  exitCode?: number;
  labels: Record<string, string>;
}

export interface ContainerStats {
  cpu: {
    usage: number; // Percentage
    system: number;
    user: number;
  };
  memory: {
    used: number; // Bytes
    total: number;
    limit: number;
    percent: number;
  };
  disk: {
    read: number;
    write: number;
  };
  network: {
    rx: number;
    tx: number;
  };
  pids: number;
}

export interface ContainerFilters {
  status?: string;
  label?: Record<string, string>;
  name?: string;
}

export interface VolumeMount {
  source: string;
  target: string;
  type: "bind" | "volume" | "tmpfs";
  readOnly?: boolean;
}

export interface ResourceLimits {
  cpu?: {
    cores?: number;
    shares?: number;
    period?: number;
    quota?: number;
  };
  memory?: {
    limit?: string; // e.g., "4g"
    reservation?: string;
    swap?: string;
  };
  pids?: {
    limit?: number;
  };
  storage?: {
    limit?: string;
  };
}

export interface NetworkConfig {
  mode: "bridge" | "host" | "none" | "container";
  name?: string;
  aliases?: string[];
  disableOutgoing?: boolean;
  allowedHosts?: string[];
}

export interface SandboxConfig {
  readOnlyRoot: boolean;
  noNewPrivileges: boolean;
  seccompProfile?: string;
  appArmorProfile?: string;
  selinuxOptions?: string[];
  dropCapabilities: string[];
  addCapabilities: string[];
  user: string;
  group?: string;
}

export interface ExecOptions {
  tty?: boolean;
  stdin?: boolean;
  stdout?: boolean;
  stderr?: boolean;
  workingDir?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

// Ralph Run Types
export interface RalphRun {
  id: string;
  name: string;
  status: RalphRunStatus;
  prd: PRDDocument;
  containerId?: string;
  currentIteration: number;
  maxIterations: number;
  gitBranch: string;
  gitProvider: GitProviderType;
  stories: UserStory[];
  progress: ProgressEntry[];
  qualityChecks: QualityCheck[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

export type RalphRunStatus =
  | "pending"
  | "initializing"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface PRDDocument {
  id: string;
  title: string;
  description: string;
  version: string;
  branchName: string;
  userStories: UserStory[];
  technicalRequirements?: string[];
  dependencies?: string[];
}

export interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: "low" | "medium" | "high" | "critical";
  passes: boolean;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  estimatedEffort?: string; // e.g., "2h", "1d"
}

export interface ProgressEntry {
  iteration: number;
  timestamp: Date;
  storyId: string;
  action: "started" | "completed" | "failed" | "retry";
  message: string;
  details?: Record<string, unknown>;
}

export interface QualityCheck {
  type: QualityCheckType;
  command: string;
  passed: boolean;
  output: string;
  duration: number;
  timestamp: Date;
}

export type QualityCheckType = "typecheck" | "tests" | "lint" | "format" | "ci" | "security";

// Git Provider Types
export type GitProviderType = "github" | "gitlab" | "bitbucket";

export interface GitProvider {
  readonly name: GitProviderType;

  authenticate(credentials: GitCredentials): Promise<GitAuthToken>;
  validateCredentials(): Promise<boolean>;

  // Repository operations
  createBranch(name: string, base: string): Promise<void>;
  deleteBranch(name: string): Promise<void>;
  getBranches(): Promise<GitBranch[]>;

  // Commit operations
  getCommits(branch: string, limit?: number): Promise<GitCommit[]>;
  getCommit(sha: string): Promise<GitCommit>;

  // Pull Request operations
  createPR(params: CreatePRParams): Promise<PullRequest>;
  getPR(number: number): Promise<PullRequest>;
  updatePR(number: number, params: Partial<CreatePRParams>): Promise<PullRequest>;
  mergePR(number: number, method?: MergeMethod): Promise<void>;
  closePR(number: number): Promise<void>;
  listPRs(state?: "open" | "closed" | "all"): Promise<PullRequest[]>;

  // CI operations
  runPipeline(name: string, branch: string): Promise<PipelineRun>;
  getPipelineStatus(runId: string): Promise<PipelineStatus>;
}

export interface GitCredentials {
  type: "pat" | "oauth" | "ssh";
  token?: string;
  username?: string;
  password?: string;
  sshKey?: string;
  oauth?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

export interface GitAuthToken {
  token: string;
  type: "bearer" | "token";
  expiresAt?: Date;
  refreshToken?: string;
}

export interface GitBranch {
  name: string;
  sha: string;
  protected: boolean;
  default: boolean;
}

export interface GitCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: Date;
  };
  committer: {
    name: string;
    email: string;
    date: Date;
  };
  parents: string[];
}

export interface CreatePRParams {
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
  labels?: string[];
  reviewers?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  merged: boolean;
  draft: boolean;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  author: {
    login: string;
  };
  labels: string[];
  url: string;
  createdAt: Date;
  updatedAt: Date;
  mergedAt?: Date;
  ciStatus: "pending" | "success" | "failure" | "error";
}

export type MergeMethod = "merge" | "squash" | "rebase";

export interface PipelineRun {
  id: string;
  status: PipelineStatus;
  url: string;
  startedAt?: Date;
  finishedAt?: Date;
}

export type PipelineStatus =
  | "pending"
  | "running"
  | "success"
  | "failure"
  | "cancelled"
  | "skipped";

// Storage Types
export type StorageType = "local" | "s3" | "minio" | "gcs" | "gdrive";

export interface StorageBackend {
  readonly name: string;
  readonly type: StorageType;

  upload(key: string, data: Buffer | NodeJS.ReadableStream): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<StorageObject[]>;

  getMetadata(key: string): Promise<StorageMetadata>;
  setMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void>;

  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}

export interface StorageMetadata {
  size: number;
  contentType: string;
  createdAt: Date;
  modifiedAt: Date;
  checksum: string;
  tags: Record<string, string>;
}

// Security Types
export interface SecurityScanner {
  scanRepository(repoPath: string): Promise<SecurityReport>;
  scanDependencies(repoPath: string): Promise<Vulnerability[]>;
  scanSecrets(repoPath: string): Promise<Secret[]>;
}

export interface SecurityReport {
  vulnerabilities: Vulnerability[];
  secrets: Secret[];
  suspiciousFiles: SuspiciousFile[];
  scannedAt: Date;
}

export interface Vulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  package: string;
  version: string;
  fixedIn?: string;
  description: string;
  cve?: string;
  location: string;
}

export interface Secret {
  type: string;
  match: string;
  file: string;
  line: number;
  severity: "critical" | "high" | "medium";
}

export interface SuspiciousFile {
  path: string;
  reason: string;
  severity: "high" | "medium" | "low";
}

// GC Policy Types
export interface GCPolicy {
  enabled: boolean;
  maxIdleTime: number; // milliseconds
  maxContainersPerUser: number;
  maxContainersPerProject: number;
  maxDiskUsage: number; // bytes
  maxMemoryUsage: number; // bytes
  preserveFailed: number; // milliseconds
  preserveCompleted: number; // milliseconds
  backupBeforeDelete: boolean;
}

export interface GCReport {
  removed: string[];
  archived: string[];
  errors: Array<{ containerId: string; error: string }>;
  timestamp: Date;
}

// Backup Types
export interface BackupConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  retention: {
    hourly: number;
    daily: number;
    weekly: number;
  };
  backends: string[];
  compression: "gzip" | "zstd" | "none";
  encryption: {
    enabled: boolean;
    keyId?: string;
  };
}

export interface BackupJob {
  id: string;
  type: "full" | "incremental";
  runId?: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  size: number;
  checksum: string;
  location: string[];
  error?: string;
}

export interface RunBackupData {
  run: RalphRun;
  prd: PRDDocument;
  progress: string;
  git: {
    branch: string;
    commits: GitCommit[];
    diff: string;
  };
  container?: {
    logs: string[];
    artifacts: Record<string, Buffer>;
  };
  workspace: Buffer; // Tar.gz
  metadata: {
    backedUpAt: Date;
    version: string;
    engine: ContainerEngineType;
  };
}

// Ralph Service Configuration
export interface RalphServiceConfig {
  enabled: boolean;
  container: {
    engine: ContainerEngineType | "auto";
    resources: ResourceLimits;
    gc: GCPolicy;
    sandbox: SandboxConfig;
  };
  git: {
    defaultProvider: GitProviderType;
    autoPR: boolean;
    commitStyle: "conventional" | "semantic";
    providers: Record<GitProviderType, { enabled: boolean }>;
  };
  storage: {
    default: string;
    backends: Record<string, StorageBackendConfig>;
  };
  backup: BackupConfig;
  security: {
    scanOnStart: boolean;
    blockOnVulnerabilities: boolean;
    allowedHosts: string[];
    blockedHosts: string[];
  };
  defaults: {
    maxIterations: number;
    qualityChecks: QualityCheckType[];
    autoMerge: boolean;
  };
}

export type StorageBackendConfig =
  | { type: "local"; path: string }
  | { type: "s3"; region: string; bucket: string; endpoint?: string }
  | { type: "minio"; endpoint: string; bucket: string; accessKey: string; secretKey: string }
  | { type: "gcs"; projectId: string; bucket: string }
  | { type: "gdrive"; folderId: string };

// Template Types
export interface PRDTemplate {
  id: string;
  name: string;
  description: string;
  category: "web" | "api" | "cli" | "mobile" | "other";
  content: string;
  defaultStories: UserStory[];
}
