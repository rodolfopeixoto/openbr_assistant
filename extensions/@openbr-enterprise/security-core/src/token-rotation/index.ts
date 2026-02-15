/**
 * TokenRotation - Automated token rotation and expiration management
 * Ensures API keys and tokens are rotated on a schedule
 */

import { EventEmitter } from 'events';

interface TokenConfig {
  name: string;
  currentToken: string;
  expiresAt?: Date;
  rotationInterval?: number; // days
  notifyBeforeExpiration?: number; // days
}

interface TokenMetadata {
  name: string;
  createdAt: Date;
  expiresAt?: Date;
  lastRotatedAt: Date;
  rotationCount: number;
  isActive: boolean;
}

interface RotationResult {
  success: boolean;
  oldToken?: string;
  newToken?: string;
  error?: string;
}

/**
 * TokenRotation - Automated token lifecycle management
 * 
 * Features:
 * - Scheduled rotation
 * - Expiration notifications
 * - Token history tracking
 * - Audit trail integration
 */
export class TokenRotation extends EventEmitter {
  private tokens: Map<string, TokenConfig> = new Map();
  private metadata: Map<string, TokenMetadata> = new Map();
  private rotationJobs: Map<string, NodeJS.Timeout> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startExpirationChecker();
  }

  /**
   * Register a token for rotation
   */
  registerToken(config: TokenConfig): void {
    this.tokens.set(config.name, config);
    
    // Initialize or update metadata
    const existing = this.metadata.get(config.name);
    this.metadata.set(config.name, {
      name: config.name,
      createdAt: existing?.createdAt || new Date(),
      expiresAt: config.expiresAt,
      lastRotatedAt: existing?.lastRotatedAt || new Date(),
      rotationCount: existing?.rotationCount || 0,
      isActive: true
    });

    // Schedule rotation if interval is set
    if (config.rotationInterval) {
      this.scheduleRotation(config.name);
    }

    this.emit('tokenRegistered', { name: config.name });
  }

  /**
   * Rotate a token manually
   */
  async rotateToken(
    name: string, 
    newTokenProvider: () => Promise<string>
  ): Promise<RotationResult> {
    const config = this.tokens.get(name);
    if (!config) {
      return { success: false, error: 'Token not found' };
    }

    const oldToken = config.currentToken;
    
    try {
      const newToken = await newTokenProvider();
      
      // Update token
      config.currentToken = newToken;
      config.expiresAt = this.calculateNewExpiry(config);
      
      // Update metadata
      const meta = this.metadata.get(name);
      if (meta) {
        meta.lastRotatedAt = new Date();
        meta.rotationCount++;
        meta.expiresAt = config.expiresAt;
      }

      this.emit('tokenRotated', {
        name,
        oldToken: this.maskToken(oldToken),
        newToken: this.maskToken(newToken),
        rotatedAt: new Date()
      });

      return {
        success: true,
        oldToken,
        newToken
      };
    } catch (error) {
      return {
        success: false,
        error: `Rotation failed: ${error}`
      };
    }
  }

  /**
   * Get token metadata
   */
  getTokenMetadata(name: string): TokenMetadata | null {
    return this.metadata.get(name) || null;
  }

  /**
   * Get all registered tokens
   */
  listTokens(): TokenMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Revoke a token
   */
  revokeToken(name: string): boolean {
    const config = this.tokens.get(name);
    if (!config) return false;

    // Cancel scheduled rotation
    const job = this.rotationJobs.get(name);
    if (job) {
      clearTimeout(job);
      this.rotationJobs.delete(name);
    }

    // Mark as inactive
    const meta = this.metadata.get(name);
    if (meta) {
      meta.isActive = false;
    }

    // Remove token (keep metadata for audit)
    this.tokens.delete(name);

    this.emit('tokenRevoked', { name, revokedAt: new Date() });
    return true;
  }

  /**
   * Check if token is expired or near expiration
   */
  checkTokenStatus(name: string): {
    isExpired: boolean;
    isNearExpiration: boolean;
    daysUntilExpiration: number | null;
  } {
    const config = this.tokens.get(name);
    if (!config || !config.expiresAt) {
      return { isExpired: false, isNearExpiration: false, daysUntilExpiration: null };
    }

    const now = new Date();
    const expiresAt = config.expiresAt;
    const daysUntilExpiration = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const notifyBefore = config.notifyBeforeExpiration || 7;

    return {
      isExpired: daysUntilExpiration < 0,
      isNearExpiration: daysUntilExpiration <= notifyBefore,
      daysUntilExpiration
    };
  }

  /**
   * Get current token value
   */
  getToken(name: string): string | null {
    return this.tokens.get(name)?.currentToken || null;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    for (const job of this.rotationJobs.values()) {
      clearTimeout(job);
    }

    this.rotationJobs.clear();
    this.tokens.clear();
    this.metadata.clear();
    this.removeAllListeners();
  }

  private scheduleRotation(name: string): void {
    const config = this.tokens.get(name);
    if (!config || !config.rotationInterval) return;

    // Cancel existing job
    const existing = this.rotationJobs.get(name);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule next rotation
    const intervalMs = config.rotationInterval * 24 * 60 * 60 * 1000;
    const job = setTimeout(() => {
      this.emit('rotationDue', { name });
    }, intervalMs);

    this.rotationJobs.set(name, job);
  }

  private startExpirationChecker(): void {
    // Check every hour
    this.checkInterval = setInterval(() => {
      for (const [name, config] of this.tokens) {
        const status = this.checkTokenStatus(name);
        
        if (status.isExpired) {
          this.emit('tokenExpired', { name, expiredAt: new Date() });
        } else if (status.isNearExpiration) {
          this.emit('tokenNearExpiration', {
            name,
            daysUntilExpiration: status.daysUntilExpiration
          });
        }
      }
    }, 60 * 60 * 1000);
  }

  private calculateNewExpiry(config: TokenConfig): Date | undefined {
    if (!config.rotationInterval) return undefined;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.rotationInterval);
    return expiresAt;
  }

  private maskToken(token: string): string {
    if (token.length <= 8) return '****';
    return token.substring(0, 4) + '****' + token.substring(token.length - 4);
  }
}

export default TokenRotation;
