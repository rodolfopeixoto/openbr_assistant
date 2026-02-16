/**
 * Compliance API - RPC handlers for compliance endpoints
 */

import type { IJsonRpcRequest } from 'openclaw/rpc';
import { scanner } from '../scanner/index.js';
import type { ComplianceFramework, ComplianceReport, ComplianceStatus } from '../types/index.js';

export class ComplianceApi {
  private reports: Map<string, ComplianceReport> = new Map();

  async handleRequest(method: string, params: unknown): Promise<unknown> {
    switch (method) {
      case 'compliance.status':
        return this.getStatus();
      
      case 'compliance.scan':
        return this.scan(params as { frameworks?: ComplianceFramework[] });
      
      case 'compliance.report.generate':
        return this.generateReport((params as { framework: ComplianceFramework }).framework);
      
      case 'compliance.reports.list':
        return this.listReports(params as { framework?: ComplianceFramework });
      
      case 'compliance.violations.list':
        return this.listViolations(params as { 
          framework?: ComplianceFramework;
          status?: string;
          severity?: string;
        });
      
      case 'compliance.violation.acknowledge':
        return this.acknowledgeViolation((params as { id: string }).id);
      
      case 'compliance.violation.resolve':
        return this.resolveViolation((params as { id: string }).id);
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private getStatus(): ComplianceStatus {
    return scanner.getStatus();
  }

  private async scan(params: { frameworks?: ComplianceFramework[] }): Promise<ComplianceReport[]> {
    const reports = await scanner.scan(params.frameworks);
    
    // Store reports
    for (const report of reports) {
      this.reports.set(report.id, report);
    }
    
    return reports;
  }

  private async generateReport(framework: ComplianceFramework): Promise<ComplianceReport> {
    const report = await scanner.scanFramework(framework);
    this.reports.set(report.id, report);
    return report;
  }

  private listReports(params: { framework?: ComplianceFramework }): { reports: ComplianceReport[] } {
    let reports = Array.from(this.reports.values());
    
    if (params.framework) {
      reports = reports.filter(r => r.framework === params.framework);
    }
    
    // Sort by generated date (newest first)
    reports.sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
    
    return { reports };
  }

  private listViolations(params: {
    framework?: ComplianceFramework;
    status?: string;
    severity?: string;
  }): { violations: import('../types/index.js').ComplianceViolation[] } {
    const violations = scanner.getViolations(params);
    return { violations };
  }

  private acknowledgeViolation(id: string): { success: boolean } {
    scanner.acknowledgeViolation(id);
    return { success: true };
  }

  private resolveViolation(id: string): { success: boolean } {
    scanner.resolveViolation(id);
    return { success: true };
  }
}

export const complianceApi = new ComplianceApi();
export default complianceApi;
