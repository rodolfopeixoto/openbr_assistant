import type { GatewayRequestHandlers } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { getAuthService, type OAuthConfig } from "../../services/auth/service.js";

const log = createSubsystemLogger("gateway:auth");

export const authServiceHandlers: GatewayRequestHandlers = {
  // Login with password
  "auth.login": async ({ params, respond }) => {
    try {
      const { email, password } = params as { email: string; password: string };
      const authService = getAuthService();

      const result = await authService.authenticatePassword(email, password);

      if (result.success && result.user) {
        if (result.requiresMfa) {
          respond(true, {
            success: true,
            requiresMfa: true,
            userId: result.user.id,
          });
        } else {
          const session = await authService.createSession(result.user.id);
          respond(true, {
            success: true,
            token: session.token,
            user: {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: result.user.role,
            },
          });
        }
      } else {
        respond(false, { error: result.error || "Authentication failed" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Login failed";
      log.error("auth.login failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Verify MFA code
  "auth.mfa.verify": async ({ params, respond }) => {
    try {
      const { userId, code } = params as { userId: string; code: string };
      const authService = getAuthService();

      const result = await authService.verifyMfa(userId, code);

      if (result.success) {
        const session = await authService.createSession(userId);
        const user = (await authService.listUsers()).find((u) => u.id === userId);

        respond(true, {
          success: true,
          token: session.token,
          user: user
            ? {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
              }
            : null,
        });
      } else {
        respond(false, { error: result.error });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "MFA verification failed";
      log.error("auth.mfa.verify failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Generate MFA secret
  "auth.mfa.setup": async ({ respond }) => {
    try {
      // In real implementation, get userId from authenticated session
      const userId = "temp-user-id";
      const authService = getAuthService();

      const { secret, qrCode } = await authService.generateMfaSecret(userId);

      respond(true, { secret, qrCode });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "MFA setup failed";
      log.error("auth.mfa.setup failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Enable MFA
  "auth.mfa.enable": async ({ params, respond }) => {
    try {
      const { secret } = params as { secret: string };
      const userId = "temp-user-id"; // Get from authenticated session
      const authService = getAuthService();

      const success = await authService.enableMfa(userId, secret);

      if (success) {
        respond(true, { success: true });
      } else {
        respond(false, { error: "Failed to enable MFA" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to enable MFA";
      log.error("auth.mfa.enable failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Logout
  "auth.logout": async ({ params, respond }) => {
    try {
      const { token } = params as { token: string };
      const authService = getAuthService();

      const success = await authService.revokeSession(token);

      respond(true, { success });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Logout failed";
      log.error("auth.logout failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Validate session
  "auth.validate": async ({ params, respond }) => {
    try {
      const { token } = params as { token: string };
      const authService = getAuthService();

      const user = await authService.validateSession(token);

      if (user) {
        respond(true, {
          valid: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        });
      } else {
        respond(false, { valid: false, error: "Invalid or expired session" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Validation failed";
      log.error("auth.validate failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // List user sessions
  "auth.sessions": async ({ respond }) => {
    try {
      const userId = "temp-user-id"; // Get from authenticated session
      const authService = getAuthService();

      const sessions = await authService.listUserSessions(userId);

      respond(true, {
        sessions: sessions.map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          ip: s.ip,
        })),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to list sessions";
      log.error("auth.sessions failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // OAuth2 authorization URL
  "auth.oauth.url": async ({ params, respond }) => {
    try {
      const { provider } = params as { provider: string };
      const authService = getAuthService();

      // OAuth config would come from settings
      const config: OAuthConfig = {
        provider,
        clientId: "client-id",
        clientSecret: "client-secret",
        redirectUri: "http://localhost:18789/auth/callback",
        scope: ["openid", "email", "profile"],
        authorizeUrl: `https://${provider}.com/oauth/authorize`,
        tokenUrl: `https://${provider}.com/oauth/token`,
        userInfoUrl: `https://${provider}.com/oauth/userinfo`,
      };

      const url = authService.getOAuthUrl(provider, config);

      respond(true, { url });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to get OAuth URL";
      log.error("auth.oauth.url failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // OAuth2 callback
  "auth.oauth.callback": async ({ params, respond }) => {
    try {
      const { provider, code } = params as { provider: string; code: string };
      const authService = getAuthService();

      const config: OAuthConfig = {
        provider,
        clientId: "client-id",
        clientSecret: "client-secret",
        redirectUri: "http://localhost:18789/auth/callback",
        scope: ["openid", "email", "profile"],
        authorizeUrl: `https://${provider}.com/oauth/authorize`,
        tokenUrl: `https://${provider}.com/oauth/token`,
        userInfoUrl: `https://${provider}.com/oauth/userinfo`,
      };

      const result = await authService.handleOAuthCallback(provider, code, config);

      if (result.success && result.user) {
        const session = await authService.createSession(result.user.id);
        respond(true, {
          success: true,
          token: session.token,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          },
        });
      } else {
        respond(false, { error: result.error });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "OAuth callback failed";
      log.error("auth.oauth.callback failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // List users (admin only)
  "auth.users.list": async ({ respond }) => {
    try {
      const authService = getAuthService();
      const users = await authService.listUsers();

      respond(true, {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          active: u.active,
          mfaEnabled: u.mfaEnabled,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
        })),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to list users";
      log.error("auth.users.list failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Create user (admin only)
  "auth.users.create": async ({ params, respond }) => {
    try {
      const { email, name, role, password } = params as {
        email: string;
        name: string;
        role: "admin" | "operator" | "viewer";
        password?: string;
      };

      const authService = getAuthService();
      const user = await authService.createUser(email, name, role, password);

      respond(true, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to create user";
      log.error("auth.users.create failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Delete user (admin only)
  "auth.users.delete": async ({ params, respond }) => {
    try {
      const { userId } = params as { userId: string };
      const authService = getAuthService();

      const success = await authService.deleteUser(userId);

      if (success) {
        respond(true, { success: true });
      } else {
        respond(false, { error: "User not found" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to delete user";
      log.error("auth.users.delete failed: " + msg);
      respond(false, { error: msg });
    }
  },
};
