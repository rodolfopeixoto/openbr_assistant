/**
 * ChangeManagement - SOC2 CC8.1 Change Control
 * Manages and tracks changes to the system
 */

import { EventEmitter } from 'events';

interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'bugfix' | 'security' | 'config';
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'implemented' | 'rolled_back';
  approvedBy?: string;
  approvedAt?: Date;
  implementedAt?: Date;
  rollbackPlan?: string;
  testingStatus?: 'pending' | 'passed' | 'failed';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedComponents: string[];
}

interface ChangeApproval {
  approver: string;
  approved: boolean;
  comments?: string;
  approvedAt: Date;
}

/**
 * ChangeManagement - SOC2 compliant change control
 * 
 * Features:
 * - Change request workflow
 * - Approval process
 * - Testing gate
 * - Rollback procedures
 * - Audit trail
 */
export class ChangeManagement extends EventEmitter {
  private changes: Map<string, ChangeRequest> = new Map();
  private approvals: Map<string, ChangeApproval[]> = new Map();
  private idCounter = 0;

  /**
   * Create a new change request
   */
  createChange(request: Omit<ChangeRequest, 'id' | 'status' | 'requestedAt'>): ChangeRequest {
    const id = `CHG-${++this.idCounter}-${Date.now()}`;
    const change: ChangeRequest = {
      ...request,
      id,
      status: 'pending',
      requestedAt: new Date()
    };

    this.changes.set(id, change);
    this.approvals.set(id, []);

    this.emit('changeCreated', { change });
    return change;
  }

  /**
   * Approve a change request
   */
  approveChange(
    changeId: string, 
    approver: string, 
    options: { comments?: string } = {}
  ): boolean {
    const change = this.changes.get(changeId);
    if (!change) return false;

    // Check if approver is not the requester
    if (approver === change.requestedBy) {
      throw new Error('Cannot approve your own change request');
    }

    const approval: ChangeApproval = {
      approver,
      approved: true,
      comments: options.comments,
      approvedAt: new Date()
    };

    const approvals = this.approvals.get(changeId) || [];
    approvals.push(approval);
    this.approvals.set(changeId, approvals);

    // Auto-approve if required approvals met
    if (this.hasRequiredApprovals(change)) {
      change.status = 'approved';
      change.approvedBy = approver;
      change.approvedAt = new Date();
    }

    this.emit('changeApproved', { change, approval });
    return true;
  }

  /**
   * Reject a change request
   */
  rejectChange(
    changeId: string, 
    approver: string, 
    reason: string
  ): boolean {
    const change = this.changes.get(changeId);
    if (!change) return false;

    const approval: ChangeApproval = {
      approver,
      approved: false,
      comments: reason,
      approvedAt: new Date()
    };

    const approvals = this.approvals.get(changeId) || [];
    approvals.push(approval);
    this.approvals.set(changeId, approvals);

    change.status = 'rejected';

    this.emit('changeRejected', { change, approval });
    return true;
  }

  /**
   * Mark change as implemented
   */
  implementChange(changeId: string, implementer: string): boolean {
    const change = this.changes.get(changeId);
    if (!change) return false;

    if (change.status !== 'approved') {
      throw new Error('Change must be approved before implementation');
    }

    if (change.testingStatus !== 'passed') {
      throw new Error('Testing must pass before implementation');
    }

    change.status = 'implemented';
    change.implementedAt = new Date();

    this.emit('changeImplemented', { change, implementer });
    return true;
  }

  /**
   * Rollback a change
   */
  rollbackChange(changeId: string, reason: string): boolean {
    const change = this.changes.get(changeId);
    if (!change) return false;

    if (change.status !== 'implemented') {
      throw new Error('Only implemented changes can be rolled back');
    }

    change.status = 'rolled_back';

    this.emit('changeRolledBack', { change, reason });
    return true;
  }

  /**
   * Update testing status
   */
  updateTestingStatus(
    changeId: string, 
    status: 'pending' | 'passed' | 'failed'
  ): boolean {
    const change = this.changes.get(changeId);
    if (!change) return false;

    change.testingStatus = status;

    this.emit('testingStatusUpdated', { change, status });
    return true;
  }

  /**
   * Get change by ID
   */
  getChange(changeId: string): ChangeRequest | null {
    return this.changes.get(changeId) || null;
  }

  /**
   * Get all changes
   */
  getAllChanges(filters?: { 
    status?: ChangeRequest['status'];
    type?: ChangeRequest['type'];
    riskLevel?: ChangeRequest['riskLevel'];
  }): ChangeRequest[] {
    let changes = Array.from(this.changes.values());

    if (filters?.status) {
      changes = changes.filter(c => c.status === filters.status);
    }
    if (filters?.type) {
      changes = changes.filter(c => c.type === filters.type);
    }
    if (filters?.riskLevel) {
      changes = changes.filter(c => c.riskLevel === filters.riskLevel);
    }

    return changes;
  }

  /**
   * Get approvals for a change
   */
  getApprovals(changeId: string): ChangeApproval[] {
    return this.approvals.get(changeId) || [];
  }

  /**
   * Get changes requiring attention
   */
  getPendingChanges(): ChangeRequest[] {
    return this.getAllChanges({ status: 'pending' });
  }

  /**
   * Get high risk changes
   */
  getHighRiskChanges(): ChangeRequest[] {
    return Array.from(this.changes.values()).filter(
      c => c.riskLevel === 'high' || c.riskLevel === 'critical'
    );
  }

  private hasRequiredApprovals(change: ChangeRequest): boolean {
    const approvals = this.approvals.get(change.id) || [];
    const approved = approvals.filter(a => a.approved);
    
    // Critical changes need 2 approvals, others need 1
    if (change.riskLevel === 'critical') {
      return approved.length >= 2;
    }
    return approved.length >= 1;
  }
}

export default ChangeManagement;
