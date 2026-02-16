/**
 * Compliance Scanner - Runs compliance checks across all frameworks
 */

import type { 
  ComplianceCheck, 
  ComplianceViolation, 
  ComplianceReport,
  FrameworkStatus,
  ComplianceStatus,
  ComplianceFramework 
} from '../types/index.js';

export class ComplianceScanner {
  private checks: Map<ComplianceFramework, ComplianceCheck[]> = new Map();
  private lastScanAt: string | null = null;
  private cachedViolations: ComplianceViolation[] = [];

  registerCheck(framework: ComplianceFramework, check: ComplianceCheck): void {
    const existing = this.checks.get(framework) || [];
    existing.push(check);
    this.checks.set(framework, existing);
  }

  async scan(frameworks?: ComplianceFramework[]): Promise<ComplianceReport[]> {
    const targetFrameworks = frameworks || Array.from(this.checks.keys());
    const reports: ComplianceReport[] = [];
    const allViolations: ComplianceViolation[] = [];

    for (const framework of targetFrameworks) {
      const checks = this.checks.get(framework) || [];
      const violations: ComplianceViolation[] = [];

      for (const check of checks) {
        try {
          const violation = await check.check();
          if (violation) {
            violations.push(violation);
            allViolations.push(violation);
          }
        } catch (error) {
          console.error(`Compliance check failed: ${check.id}`, error);
        }
      }

      const score = this.calculateScore(checks.length, violations.length);
      const status = this.determineStatus(score, violations);

      reports.push({
        id: `report-${framework}-${Date.now()}`,
        framework,
        generatedAt: new Date().toISOString(),
        status,
        score,
        violationsCount: violations.length,
        summary: `${violations.length} violations found in ${checks.length} checks`,
        details: { checksRun: checks.length },
        violations
      });
    }

    this.lastScanAt = new Date().toISOString();
    this.cachedViolations = allViolations;

    return reports;
  }

  async scanFramework(framework: ComplianceFramework): Promise<ComplianceReport> {
    const reports = await this.scan([framework]);
    return reports[0];
  }

  getStatus(): ComplianceStatus {
    const frameworks: Record<ComplianceFramework, FrameworkStatus> = {
      gdpr: { status: 'pending', score: 0, lastAudit: '', violations: 0 },
      lgpd: { status: 'pending', score: 0, lastAudit: '', violations: 0 },
      soc2: { status: 'pending', score: 0, lastAudit: '', violations: 0 },
      hipaa: { status: 'pending', score: 0, lastAudit: '', violations: 0 }
    };

    // Aggregate by framework
    for (const violation of this.cachedViolations) {
      const fw = frameworks[violation.framework];
      fw.violations++;
    }

    const totalViolations = this.cachedViolations.length;
    const recentViolations = this.cachedViolations
      .filter(v => v.status !== 'resolved')
      .slice(0, 10);

    // Determine overall status
    let overallStatus: ComplianceStatus['overallStatus'] = 'compliant';
    if (totalViolations > 10) {
      overallStatus = 'non-compliant';
    } else if (totalViolations > 0) {
      overallStatus = 'at-risk';
    }

    return {
      overallStatus,
      violationsCount: totalViolations,
      lastScanAt: this.lastScanAt || '',
      nextAuditAt: this.calculateNextAudit(),
      frameworks,
      recentViolations
    };
  }

  getViolations(filters?: { 
    framework?: ComplianceFramework; 
    status?: string;
    severity?: string;
  }): ComplianceViolation[] {
    let violations = this.cachedViolations;

    if (filters?.framework) {
      violations = violations.filter(v => v.framework === filters.framework);
    }
    if (filters?.status) {
      violations = violations.filter(v => v.status === filters.status);
    }
    if (filters?.severity) {
      violations = violations.filter(v => v.severity === filters.severity);
    }

    return violations;
  }

  acknowledgeViolation(id: string): void {
    const violation = this.cachedViolations.find(v => v.id === id);
    if (violation) {
      violation.status = 'acknowledged';
    }
  }

  resolveViolation(id: string): void {
    const violation = this.cachedViolations.find(v => v.id === id);
    if (violation) {
      violation.status = 'resolved';
      violation.resolvedAt = new Date().toISOString();
    }
  }

  private calculateScore(totalChecks: number, violations: number): number {
    if (totalChecks === 0) return 100;
    const penalty = violations * 10;
    return Math.max(0, Math.min(100, 100 - penalty));
  }

  private determineStatus(score: number, violations: ComplianceViolation[]): 
    'compliant' | 'at-risk' | 'non-compliant' {
    const critical = violations.filter(v => v.severity === 'critical').length;
    const high = violations.filter(v => v.severity === 'high').length;

    if (critical > 0 || score < 50) return 'non-compliant';
    if (high > 0 || score < 80) return 'at-risk';
    return 'compliant';
  }

  private calculateNextAudit(): string {
    const next = new Date();
    next.setDate(next.getDate() + 7); // Weekly audits
    return next.toISOString();
  }
}

export const scanner = new ComplianceScanner();
export default scanner;
