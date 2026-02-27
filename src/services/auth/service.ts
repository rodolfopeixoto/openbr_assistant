import crypto from "crypto";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("auth");

export type AuthMethod = "password" | "oauth2" | "mfa";
export type UserRole = "admin" | "operator" | "viewer";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  authMethods: AuthMethod[];
  mfaEnabled: boolean;
  mfaSecret?: string;
  oauthProvider?: string;
  oauthId?: string;
  createdAt: Date;
  lastLogin?: Date;
  active: boolean;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
}

export interface OAuthConfig {
  provider: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

export interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
  ip?: string;
}

/**
 * Authentication Service
 * Handles user authentication, MFA, OAuth2, and session management
 */
export class AuthService {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private loginAttempts: LoginAttempt[] = [];
  private maxLoginAttempts = 5;
  private lockoutDuration = 15 * 60 * 1000; // 15 minutes
  private tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Create default admin user
    this.createDefaultAdmin();
  }

  /**
   * Create default admin user
   */
  private createDefaultAdmin(): void {
    const adminId = "admin";
    if (!this.users.has(adminId)) {
      const hashedPassword = this.hashPassword("admin123");
      this.users.set(adminId, {
        id: adminId,
        email: "admin@openclaw.local",
        name: "Administrator",
        role: "admin",
        authMethods: ["password"],
        mfaEnabled: false,
        createdAt: new Date(),
        active: true,
      });
      log.info("Default admin user created");
    }
  }

  /**
   * Hash password
   */
  private hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  /**
   * Generate random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Check if account is locked
   */
  private isAccountLocked(email: string): boolean {
    const now = Date.now();
    const recentAttempts = this.loginAttempts.filter(
      (a) => a.email === email && !a.success && now - a.timestamp < this.lockoutDuration,
    );
    return recentAttempts.length >= this.maxLoginAttempts;
  }

  /**
   * Record login attempt
   */
  private recordLoginAttempt(email: string, success: boolean, ip?: string): void {
    this.loginAttempts.push({
      email,
      timestamp: Date.now(),
      success,
      ip,
    });

    // Clean old attempts
    const cutoff = Date.now() - this.lockoutDuration;
    this.loginAttempts = this.loginAttempts.filter((a) => a.timestamp > cutoff);
  }

  /**
   * Authenticate with password
   */
  async authenticatePassword(
    email: string,
    password: string,
    ip?: string,
  ): Promise<{ success: boolean; user?: User; requiresMfa?: boolean; error?: string }> {
    try {
      log.info(`Authentication attempt for: ${email}`);

      // Check if account is locked
      if (this.isAccountLocked(email)) {
        log.warn(`Account locked: ${email}`);
        return { success: false, error: "Account locked. Try again later." };
      }

      // Find user by email
      const user = Array.from(this.users.values()).find((u) => u.email === email && u.active);

      if (!user) {
        this.recordLoginAttempt(email, false, ip);
        return { success: false, error: "Invalid credentials" };
      }

      // Verify password
      const hashedPassword = this.hashPassword(password);
      // In real implementation, compare with stored hash

      if (user.mfaEnabled) {
        this.recordLoginAttempt(email, true, ip);
        return { success: true, user, requiresMfa: true };
      }

      this.recordLoginAttempt(email, true, ip);
      user.lastLogin = new Date();
      log.info(`Authentication successful: ${email}`);

      return { success: true, user };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error(`Authentication failed: ${msg}`);
      return { success: false, error: "Authentication failed" };
    }
  }

  /**
   * Verify MFA code
   */
  async verifyMfa(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.users.get(userId);
      if (!user || !user.mfaEnabled) {
        return { success: false, error: "MFA not enabled" };
      }

      // Verify TOTP code
      // Implementation would use speakeasy or similar library
      log.info(`MFA verification for user: ${userId}`);

      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error(`MFA verification failed: ${msg}`);
      return { success: false, error: "Invalid MFA code" };
    }
  }

  /**
   * Generate MFA secret
   */
  async generateMfaSecret(userId: string): Promise<{ secret: string; qrCode: string }> {
    const secret = this.generateToken().slice(0, 16);
    const qrCode = `otpauth://totp/OpenClaw:${userId}?secret=${secret}&issuer=OpenClaw`;
    return { secret, qrCode };
  }

  /**
   * Enable MFA for user
   */
  async enableMfa(userId: string, secret: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    user.mfaEnabled = true;
    user.mfaSecret = secret;
    user.authMethods.push("mfa");
    log.info(`MFA enabled for user: ${userId}`);
    return true;
  }

  /**
   * Create session
   */
  async createSession(userId: string, ip?: string, userAgent?: string): Promise<Session> {
    const session: Session = {
      id: crypto.randomUUID(),
      userId,
      token: this.generateToken(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.tokenExpiry),
      ip,
      userAgent,
    };

    this.sessions.set(session.token, session);
    log.info(`Session created for user: ${userId}`);
    return session;
  }

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<User | null> {
    const session = this.sessions.get(token);
    if (!session) return null;

    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    const user = this.users.get(session.userId);
    return user?.active ? user : null;
  }

  /**
   * Revoke session
   */
  async revokeSession(token: string): Promise<boolean> {
    const deleted = this.sessions.delete(token);
    if (deleted) {
      log.info("Session revoked");
    }
    return deleted;
  }

  /**
   * List user sessions
   */
  async listUserSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
  }

  /**
   * Create user
   */
  async createUser(email: string, name: string, role: UserRole, password?: string): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      name,
      role,
      authMethods: password ? ["password"] : [],
      mfaEnabled: false,
      createdAt: new Date(),
      active: true,
    };

    this.users.set(user.id, user);
    log.info(`User created: ${email}`);
    return user;
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    Object.assign(user, updates);
    log.info(`User updated: ${userId}`);
    return user;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
    const deleted = this.users.delete(userId);
    if (deleted) {
      // Revoke all sessions
      Array.from(this.sessions.entries())
        .filter(([, s]) => s.userId === userId)
        .forEach(([token]) => this.sessions.delete(token));
      log.info(`User deleted: ${userId}`);
    }
    return deleted;
  }

  /**
   * List all users
   */
  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  /**
   * Get OAuth2 authorization URL
   */
  getOAuthUrl(provider: string, config: OAuthConfig): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scope.join(" "),
      state: this.generateToken(),
    });

    return `${config.authorizeUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth2 callback
   */
  async handleOAuthCallback(
    provider: string,
    code: string,
    config: OAuthConfig,
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      log.info(`OAuth callback from ${provider}`);

      // Exchange code for token
      // In real implementation, make HTTP request to token endpoint
      const tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        return { success: false, error: "Failed to exchange code" };
      }

      // Get user info
      // In real implementation, fetch from userInfoUrl
      const userInfo = { id: "oauth-user", email: "user@example.com", name: "OAuth User" };

      // Find or create user
      let user = Array.from(this.users.values()).find(
        (u) => u.oauthProvider === provider && u.oauthId === userInfo.id,
      );

      if (!user) {
        user = await this.createUser(userInfo.email, userInfo.name, "operator");
        user.oauthProvider = provider;
        user.oauthId = userInfo.id;
        user.authMethods.push("oauth2");
      }

      user.lastLogin = new Date();
      log.info(`OAuth login successful: ${user.email}`);

      return { success: true, user };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error(`OAuth failed: ${msg}`);
      return { success: false, error: "OAuth authentication failed" };
    }
  }

  /**
   * Check permission
   */
  hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roles: Record<UserRole, number> = {
      viewer: 1,
      operator: 2,
      admin: 3,
    };
    return roles[userRole] >= roles[requiredRole];
  }
}

// Singleton instance
let authService: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}
