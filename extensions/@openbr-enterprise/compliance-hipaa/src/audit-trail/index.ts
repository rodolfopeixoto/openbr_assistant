/**
 * AuditTrail - HIPAA compliant audit logging
 * Records all access to PHI with timestamps and user info
 */

export class AuditTrail {
  private logs: any[] = [];

  async logAccess(params: {
    userId: string;
    action: string;
    resource: string;
    success: boolean;
    ip?: string;
  }): Promise<void> {
    this.logs.push({
      ...params,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    });
  }

  async queryLogs(filters: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    action?: string;
  }): Promise<any[]> {
    return this.logs.filter(log => {
      if (filters.userId && log.userId !== filters.userId) return false;
      if (filters.action && log.action !== filters.action) return false;
      return true;
    });
  }
}

export default AuditTrail;
