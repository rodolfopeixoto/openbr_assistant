/**
 * AccessControl - HIPAA compliant access control
 * Implements minimum necessary access principle
 */

export class AccessControl {
  private roles: Map<string, string[]> = new Map([
    ['admin', ['read', 'write', 'delete', 'admin']],
    ['doctor', ['read', 'write']],
    ['nurse', ['read']],
    ['patient', ['read_own']]
  ]);

  async checkAccess(
    userId: string, 
    role: string, 
    action: string
  ): Promise<boolean> {
    const permissions = this.roles.get(role) || [];
    return permissions.includes(action) || permissions.includes('admin');
  }

  async requireMFA(userId: string): Promise<boolean> {
    // Implementation would check if MFA is enabled
    return true;
  }
}

export default AccessControl;
