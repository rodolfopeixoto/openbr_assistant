/**
 * ConsentManager - GDPR Article 7: Conditions for consent
 * Manages user consent for data processing
 */

export class ConsentManager {
  private consents: Map<string, any> = new Map();

  async recordConsent(
    userId: string, 
    purpose: string, 
    granted: boolean
  ): Promise<void> {
    this.consents.set(`${userId}:${purpose}`, {
      userId,
      purpose,
      granted,
      timestamp: new Date().toISOString()
    });
  }

  async checkConsent(userId: string, purpose: string): Promise<boolean> {
    const consent = this.consents.get(`${userId}:${purpose}`);
    return consent?.granted || false;
  }

  async revokeConsent(userId: string, purpose: string): Promise<void> {
    await this.recordConsent(userId, purpose, false);
  }
}

export default ConsentManager;
