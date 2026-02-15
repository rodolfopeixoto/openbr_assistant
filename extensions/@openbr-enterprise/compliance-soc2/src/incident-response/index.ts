/**
 * IncidentResponse - SOC2 CC7.3, CC7.4, CC7.5
 * Manages security incidents and response procedures
 */

import { EventEmitter } from 'events';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'closed';
  category: 'security' | 'availability' | 'integrity' | 'confidentiality' | 'compliance';
  detectedAt: Date;
  detectedBy: string;
  assignedTo?: string;
  containmentActions?: string[];
  resolutionActions?: string[];
  lessonsLearned?: string;
  closedAt?: Date;
  closedBy?: string;
}

interface IncidentUpdate {
  timestamp: Date;
  user: string;
  message: string;
  status?: Incident['status'];
}

interface ResponsePlaybook {
  name: string;
  triggers: string[];
  severity: Incident['severity'];
  steps: string[];
  autoActions?: string[];
  escalationTimeMinutes?: number;
}

/**
 * IncidentResponse - SOC2 compliant incident management
 * 
 * Features:
 * - Incident tracking
 * - Response playbooks
 * - Automated actions
 * - Escalation procedures
 * - Post-incident reviews
 */
export class IncidentResponse extends EventEmitter {
  private incidents: Map<string, Incident> = new Map();
  private updates: Map<string, IncidentUpdate[]> = new Map();
  private playbooks: Map<string, ResponsePlaybook> = new Map();
  private idCounter = 0;

  constructor() {
    super();
    this.loadDefaultPlaybooks();
  }

  /**
   * Create a new incident
   */
  createIncident(incident: Omit<Incident, 'id' | 'detectedAt' | 'status'>): Incident {
    const id = `INC-${++this.idCounter}-${Date.now()}`;
    const newIncident: Incident = {
      ...incident,
      id,
      detectedAt: new Date(),
      status: 'detected'
    };

    this.incidents.set(id, newIncident);
    this.updates.set(id, []);

    // Check for matching playbooks
    this.executePlaybook(newIncident);

    this.emit('incidentCreated', { incident: newIncident });
    return newIncident;
  }

  /**
   * Update incident status
   */
  updateStatus(
    incidentId: string, 
    status: Incident['status'], 
    user: string, 
    comment?: string
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    const oldStatus = incident.status;
    incident.status = status;

    if (status === 'resolved' && !incident.resolutionActions) {
      incident.resolutionActions = [];
    }

    if (status === 'closed') {
      incident.closedAt = new Date();
      incident.closedBy = user;
    }

    this.addUpdate(incidentId, user, 
      `Status changed from ${oldStatus} to ${status}${comment ? ': ' + comment : ''}`,
      status
    );

    this.emit('incidentUpdated', { incident, oldStatus, newStatus: status });
    return true;
  }

  /**
   * Assign incident to user
   */
  assignIncident(incidentId: string, assignee: string, assignedBy: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    incident.assignedTo = assignee;
    this.addUpdate(incidentId, assignedBy, `Assigned to ${assignee}`);

    this.emit('incidentAssigned', { incident, assignee });
    return true;
  }

  /**
   * Add containment action
   */
  addContainmentAction(
    incidentId: string, 
    action: string, 
    user: string
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    if (!incident.containmentActions) {
      incident.containmentActions = [];
    }

    incident.containmentActions.push(action);
    this.addUpdate(incidentId, user, `Containment action: ${action}`);

    this.emit('containmentActionAdded', { incident, action });
    return true;
  }

  /**
   * Add resolution action
   */
  addResolutionAction(
    incidentId: string, 
    action: string, 
    user: string
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    if (!incident.resolutionActions) {
      incident.resolutionActions = [];
    }

    incident.resolutionActions.push(action);
    this.addUpdate(incidentId, user, `Resolution action: ${action}`);

    this.emit('resolutionActionAdded', { incident, action });
    return true;
  }

  /**
   * Close incident with lessons learned
   */
  closeIncident(
    incidentId: string, 
    lessonsLearned: string, 
    user: string
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    if (incident.status !== 'resolved') {
      throw new Error('Incident must be resolved before closing');
    }

    incident.lessonsLearned = lessonsLearned;
    this.updateStatus(incidentId, 'closed', user, 'Incident review completed');

    this.emit('incidentClosed', { incident });
    return true;
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId: string): Incident | null {
    return this.incidents.get(incidentId) || null;
  }

  /**
   * Get all incidents
   */
  getIncidents(filters?: {
    status?: Incident['status'];
    severity?: Incident['severity'];
    category?: Incident['category'];
    assignedTo?: string;
  }): Incident[] {
    let incidents = Array.from(this.incidents.values());

    if (filters?.status) {
      incidents = incidents.filter(i => i.status === filters.status);
    }
    if (filters?.severity) {
      incidents = incidents.filter(i => i.severity === filters.severity);
    }
    if (filters?.category) {
      incidents = incidents.filter(i => i.category === filters.category);
    }
    if (filters?.assignedTo) {
      incidents = incidents.filter(i => i.assignedTo === filters.assignedTo);
    }

    return incidents.sort((a, b) => 
      b.detectedAt.getTime() - a.detectedAt.getTime()
    );
  }

  /**
   * Get incident timeline
   */
  getIncidentTimeline(incidentId: string): IncidentUpdate[] {
    return this.updates.get(incidentId) || [];
  }

  /**
   * Get open incidents
   */
  getOpenIncidents(): Incident[] {
    return this.getIncidents().filter(i => 
      i.status !== 'closed' && i.status !== 'resolved'
    );
  }

  /**
   * Get incidents requiring attention (critical/high, not assigned)
   */
  getPendingIncidents(): Incident[] {
    return this.getIncidents()
      .filter(i => 
        (i.severity === 'critical' || i.severity === 'high') &&
        !i.assignedTo &&
        i.status !== 'closed' &&
        i.status !== 'resolved'
      );
  }

  /**
   * Add custom playbook
   */
  addPlaybook(playbook: ResponsePlaybook): void {
    this.playbooks.set(playbook.name, playbook);
  }

  private loadDefaultPlaybooks(): void {
    // Security breach playbook
    this.addPlaybook({
      name: 'security-breach',
      triggers: ['unauthorized-access', 'data-exfiltration'],
      severity: 'critical',
      steps: [
        'Isolate affected systems',
        'Preserve evidence',
        'Notify security team',
        'Assess scope of breach',
        'Implement containment',
        'Begin forensic analysis'
      ],
      autoActions: ['isolate-system'],
      escalationTimeMinutes: 15
    });

    // Availability incident playbook
    this.addPlaybook({
      name: 'service-outage',
      triggers: ['service-down', 'high-error-rate'],
      severity: 'high',
      steps: [
        'Check system health',
        'Review recent changes',
        'Check error logs',
        'Implement rollback if needed',
        'Monitor recovery'
      ],
      escalationTimeMinutes: 30
    });
  }

  private executePlaybook(incident: Incident): void {
    for (const playbook of this.playbooks.values()) {
      if (playbook.severity === incident.severity) {
        this.emit('playbookTriggered', { incident, playbook });

        // Execute auto-actions
        if (playbook.autoActions) {
          for (const action of playbook.autoActions) {
            this.emit('autoActionExecuted', { incident, action });
          }
        }
      }
    }
  }

  private addUpdate(
    incidentId: string, 
    user: string, 
    message: string, 
    status?: Incident['status']
  ): void {
    const updates = this.updates.get(incidentId) || [];
    updates.push({
      timestamp: new Date(),
      user,
      message,
      status
    });
    this.updates.set(incidentId, updates);
  }
}

export default IncidentResponse;
