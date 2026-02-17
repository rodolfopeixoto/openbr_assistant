import type { AuthProfileCredential, AuthProfileStore } from "../../agents/auth-profiles/types.js";
import type { GatewayRequestHandlers } from "./types.js";
import {
  ensureAuthProfileStore,
  updateAuthProfileStoreWithLock,
} from "../../agents/auth-profiles/store.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export interface AuthProfileSummary {
  id: string;
  provider: string;
  type: "api_key" | "oauth" | "token";
  email?: string;
}

export interface AuthListResult {
  profiles: AuthProfileSummary[];
}

export interface AuthAddParams {
  profileId: string;
  credential: AuthProfileCredential;
  testConnection?: boolean;
}

export interface AuthAddResult {
  success: boolean;
  error?: string;
  tested?: boolean;
  testError?: string;
}

export interface AuthRemoveParams {
  profileId: string;
}

export interface AuthRemoveResult {
  success: boolean;
  error?: string;
}

export interface AuthUpdateParams {
  profileId: string;
  credential: Partial<AuthProfileCredential>;
  testConnection?: boolean;
}

export interface AuthUpdateResult {
  success: boolean;
  error?: string;
  tested?: boolean;
  testError?: string;
}

export interface AuthTestParams {
  profileId: string;
}

export interface AuthTestResult {
  success: boolean;
  error?: string;
  latency?: number;
}

// Simple connection test for providers
async function testProviderConnection(
  provider: string,
  credential: AuthProfileCredential,
): Promise<{ success: boolean; error?: string; latency?: number }> {
  const startTime = Date.now();

  try {
    // Provider-specific health check logic
    switch (provider) {
      case "openai": {
        const key = credential.type === "api_key" ? credential.key : null;
        if (!key) {
          return { success: false, error: "API key required for OpenAI" };
        }

        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
          method: "GET",
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `OpenAI API error: ${response.status} ${error}` };
        }

        return { success: true, latency: Date.now() - startTime };
      }

      case "anthropic": {
        const key = credential.type === "api_key" ? credential.key : null;
        if (!key) {
          return { success: false, error: "API key required for Anthropic" };
        }

        const response = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          method: "GET",
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Anthropic API error: ${response.status} ${error}` };
        }

        return { success: true, latency: Date.now() - startTime };
      }

      case "google": {
        const key = credential.type === "api_key" ? credential.key : null;
        if (!key) {
          return { success: false, error: "API key required for Google" };
        }

        // Test with a simple models list request
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=1`,
          { method: "GET" },
        );

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Google API error: ${response.status} ${error}` };
        }

        return { success: true, latency: Date.now() - startTime };
      }

      // For other providers, we skip the test or do a basic validation
      default:
        // Basic validation: check if credential has required fields
        if (credential.type === "api_key" && !credential.key) {
          return { success: false, error: "API key is empty" };
        }
        if (credential.type === "token" && !credential.token) {
          return { success: false, error: "Token is empty" };
        }
        if (credential.type === "oauth" && (!credential.access || !credential.refresh)) {
          return { success: false, error: "OAuth credentials incomplete" };
        }

        // For now, assume success for providers we don't explicitly test
        return { success: true, latency: Date.now() - startTime };
    }
  } catch (err) {
    return { success: false, error: `Connection test failed: ${String(err)}` };
  }
}

export const authHandlers: GatewayRequestHandlers = {
  "auth.list": async ({ respond }) => {
    try {
      const store = ensureAuthProfileStore();

      const profiles: AuthProfileSummary[] = Object.entries(store.profiles).map(
        ([id, credential]) => ({
          id,
          provider: credential.provider,
          type: credential.type,
          email: credential.email,
        }),
      );

      respond(true, { profiles } satisfies AuthListResult);
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to list auth profiles: ${error}`),
      );
    }
  },

  "auth.add": async ({ params, respond }) => {
    try {
      const { profileId, credential, testConnection = true } = params as unknown as AuthAddParams;

      if (!profileId || !credential) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "missing profileId or credential"),
        );
        return;
      }

      // Validate profileId format: provider:name
      if (!profileId.includes(":")) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "profileId must be in format 'provider:name'"),
        );
        return;
      }

      const [provider] = profileId.split(":");

      // Test connection if requested
      let testResult: { success: boolean; error?: string; latency?: number } | undefined;
      if (testConnection) {
        testResult = await testProviderConnection(provider, credential);
        if (!testResult.success) {
          respond(true, {
            success: false,
            error: `Connection test failed: ${testResult.error}`,
            tested: true,
            testError: testResult.error,
          } satisfies AuthAddResult);
          return;
        }
      }

      // Add the credential to the store
      const store = await updateAuthProfileStoreWithLock({
        updater: (s: AuthProfileStore) => {
          s.profiles[profileId] = credential;
          return true;
        },
      });

      if (!store) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, "failed to acquire lock on auth store"),
        );
        return;
      }

      respond(true, {
        success: true,
        tested: testConnection,
        testError: testResult?.error,
      } satisfies AuthAddResult);
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to add auth profile: ${error}`),
      );
    }
  },

  "auth.remove": async ({ params, respond }) => {
    try {
      const { profileId } = params as unknown as AuthRemoveParams;

      if (!profileId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing profileId"));
        return;
      }

      const store = await updateAuthProfileStoreWithLock({
        updater: (s: AuthProfileStore) => {
          if (!(profileId in s.profiles)) {
            return false;
          }
          delete s.profiles[profileId];

          // Clean up from order if present
          if (s.order) {
            for (const provider of Object.keys(s.order)) {
              s.order[provider] = s.order[provider].filter((id) => id !== profileId);
            }
          }

          // Clean up from lastGood if present
          if (s.lastGood) {
            for (const provider of Object.keys(s.lastGood)) {
              if (s.lastGood[provider] === profileId) {
                delete s.lastGood[provider];
              }
            }
          }

          // Clean up usage stats
          if (s.usageStats && profileId in s.usageStats) {
            delete s.usageStats[profileId];
          }

          return true;
        },
      });

      if (!store) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, "failed to acquire lock on auth store"),
        );
        return;
      }

      respond(true, { success: true } satisfies AuthRemoveResult);
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to remove auth profile: ${error}`),
      );
    }
  },

  "auth.update": async ({ params, respond }) => {
    try {
      const {
        profileId,
        credential,
        testConnection = true,
      } = params as unknown as AuthUpdateParams;

      if (!profileId || !credential) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "missing profileId or credential"),
        );
        return;
      }

      const store = ensureAuthProfileStore();
      const existing = store.profiles[profileId];

      if (!existing) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `profile not found: ${profileId}`),
        );
        return;
      }

      // Merge credentials
      const updated: AuthProfileCredential = {
        ...existing,
        ...credential,
        // Ensure type and provider are preserved
        type: credential.type || existing.type,
        provider: credential.provider || existing.provider,
      } as AuthProfileCredential;

      // Test connection if requested
      let testResult: { success: boolean; error?: string; latency?: number } | undefined;
      if (testConnection) {
        testResult = await testProviderConnection(updated.provider, updated);
        if (!testResult.success) {
          respond(true, {
            success: false,
            error: `Connection test failed: ${testResult.error}`,
            tested: true,
            testError: testResult.error,
          } satisfies AuthUpdateResult);
          return;
        }
      }

      // Update the credential
      const updatedStore = await updateAuthProfileStoreWithLock({
        updater: (s: AuthProfileStore) => {
          s.profiles[profileId] = updated;
          return true;
        },
      });

      if (!updatedStore) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, "failed to acquire lock on auth store"),
        );
        return;
      }

      respond(true, {
        success: true,
        tested: testConnection,
        testError: testResult?.error,
      } satisfies AuthUpdateResult);
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to update auth profile: ${error}`),
      );
    }
  },

  "auth.test": async ({ params, respond }) => {
    try {
      const { profileId } = params as unknown as AuthTestParams;

      if (!profileId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing profileId"));
        return;
      }

      const store = ensureAuthProfileStore();
      const credential = store.profiles[profileId];

      if (!credential) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `profile not found: ${profileId}`),
        );
        return;
      }

      const result = await testProviderConnection(credential.provider, credential);

      if (result.success) {
        respond(true, {
          success: true,
          latency: result.latency,
        } satisfies AuthTestResult);
      } else {
        respond(true, {
          success: false,
          error: result.error,
        } satisfies AuthTestResult);
      }
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to test auth profile: ${error}`),
      );
    }
  },

  "auth.oauth.start": async ({ params, respond }) => {
    try {
      const { providerId } = params as { providerId: string };

      if (!providerId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing providerId"));
        return;
      }

      // Provider-specific OAuth configurations
      // Use a localhost callback that the UI can handle
      const oauthConfigs: Record<
        string,
        { authUrl: string; clientId: string; scopes: string[]; redirectUri: string }
      > = {
        google: {
          authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
          clientId: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
          scopes: [
            "https://www.googleapis.com/auth/cloud-platform",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
          ],
          redirectUri: "http://localhost:51121/oauth-callback",
        },
      };

      const config = oauthConfigs[providerId];
      if (!config) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `OAuth not supported for provider: ${providerId}`),
        );
        return;
      }

      // Generate PKCE
      const crypto = await import("node:crypto");
      const verifier = crypto.randomBytes(32).toString("hex");
      const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
      const state = crypto.randomBytes(16).toString("hex");

      // Store verifier temporarily (in memory or session)
      // For now, we'll return it to the client
      const authUrl = new URL(config.authUrl);
      authUrl.searchParams.set("client_id", config.clientId);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", config.redirectUri);
      authUrl.searchParams.set("scope", config.scopes.join(" "));
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      respond(true, {
        authUrl: authUrl.toString(),
        state,
        verifier, // In production, store this server-side
        redirectUri: config.redirectUri,
      });
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to start OAuth: ${error}`),
      );
    }
  },

  "auth.oauth.callback": async ({ params, respond }) => {
    try {
      const { code, state, verifier, providerId } = params as {
        code: string;
        state: string;
        verifier: string;
        providerId: string;
      };

      if (!code || !state || !verifier || !providerId) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "missing OAuth callback parameters"),
        );
        return;
      }

      // Exchange code for tokens (implementation depends on provider)
      // This is a simplified example for Google
      if (providerId === "google") {
        const tokenUrl = "https://oauth2.googleapis.com/token";
        const clientId =
          "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ""; // Should be configured
        const redirectUri = "http://localhost:51121/oauth-callback";

        const response = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
            code_verifier: verifier,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, `Token exchange failed: ${errorText}`),
          );
          return;
        }

        const data = (await response.json()) as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };

        // Get user email
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const userData = (await userResponse.json()) as { email?: string };

        // Save credentials
        const profileId = `google:${userData.email || "default"}`;
        const store = await updateAuthProfileStoreWithLock({
          updater: (s: AuthProfileStore) => {
            s.profiles[profileId] = {
              type: "oauth",
              provider: "google",
              access: data.access_token,
              refresh: data.refresh_token,
              expires: Date.now() + data.expires_in * 1000 - 5 * 60 * 1000,
              email: userData.email,
            };
            return true;
          },
        });

        if (!store) {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.UNAVAILABLE, "failed to save OAuth credentials"),
          );
          return;
        }

        respond(true, {
          success: true,
          profileId,
          email: userData.email,
        });
      } else {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `OAuth callback not implemented for: ${providerId}`,
          ),
        );
      }
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `OAuth callback failed: ${error}`),
      );
    }
  },
};
