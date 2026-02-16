/**
 * Core compliance types shared across all frameworks
 */

export type ComplianceFramework = 'gdpr' | 'lgpd' | 'soc2' | 'hipaa';

export type ComplianceSeverity = 'critical' | 'high' | 'medium' | 'low';

export type ViolationStatus = 'open' | 'acknowledged' | 'resolved';

export interface ComplianceViolation {
  id: string;
  framework: ComplianceFramework;
  severity: ComplianceSeverity;
  status: ViolationStatus;
  title: string;
  description: string;
  resource?: string;
  detectedAt: string;
  resolvedAt?: string;
  remediation?: string;
  checkId: string;
}

export interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  severity: ComplianceSeverity;
  framework: ComplianceFramework;
  check(): Promise<ComplianceViolation | null>;
}

export interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  generatedAt: string;
  status: 'compliant' | 'at-risk' | 'non-compliant';
  score: number;
  violationsCount: number;
  summary: string;
  details: Record<string, unknown>;
  violations: ComplianceViolation[];
}

export interface FrameworkStatus {
  status: 'compliant' | 'at-risk' | 'non-compliant' | 'pending';
  score: number;
  lastAudit: string;
  violations: number;
}

export interface ComplianceStatus {
  overallStatus: 'compliant' | 'at-risk' | 'non-compliant' | 'pending';
  violationsCount: number;
  lastScanAt: string;
  nextAuditAt: string;
  frameworks: Record<ComplianceFramework, FrameworkStatus>;
  recentViolations: ComplianceViolation[];
}

export interface ComplianceConfig {
  enabled: boolean;
  frameworks: ComplianceFramework[];
  autoScan: boolean;
  scanSchedule: string; // cron expression
  retentionDays: number;
  alertChannels: string[];
}
