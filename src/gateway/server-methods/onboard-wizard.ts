// Onboarding Wizard - Backend Handlers
// Spec O1: Onboarding Wizard com GUI

import * as crypto from "node:crypto";
import type { GatewayRequestHandlers } from "./types.js";
import { loadConfig, writeConfigFile } from "../../config/config.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

// Session management for onboarding
const onboardingSessions = new Map<string, OnboardingSession>();

interface OnboardingSession {
  token: string;
  createdAt: number;
  expiresAt: number;
  step: OnboardingStep;
  config: Record<string, any>;
}

type OnboardingStep = "welcome" | "auth" | "channels" | "features" | "complete";

interface OnboardingWizardResponse {
  success: boolean;
  step: OnboardingStep;
  progress: number;
  nextStep?: OnboardingStep;
  prevStep?: OnboardingStep;
  config?: Record<string, any>;
  token?: string;
  message?: string;
}

// Generate secure token
function generateOnboardingToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Create default config
function createDefaultConfig(): Record<string, any> {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    gateway: {
      port: 18789,
      mode: "local",
      bind: "loopback",
      auth: {
        mode: "token",
        token,
      },
      controlUi: {
        enabled: true,
        basePath: "/ui",
        dangerouslyDisableDeviceAuth: true,
        allowInsecureAuth: true,
      },
    },
  };
}

// Calculate progress
function calculateProgress(step: OnboardingStep): number {
  const steps: OnboardingStep[] = ["welcome", "auth", "channels", "features", "complete"];
  const index = steps.indexOf(step);
  return Math.round((index / (steps.length - 1)) * 100);
}

// Validate API key
async function validateApiKey(provider: string, apiKey: string): Promise<boolean> {
  if (provider === "anthropic") {
    return apiKey.startsWith("sk-ant-");
  } else if (provider === "openai") {
    return apiKey.startsWith("sk-");
  }
  return apiKey.length > 20;
}

export const onboardWizardHandlers: GatewayRequestHandlers = {
  "onboard.wizard": async ({ params, respond }) => {
    try {
      const action = params.action as string;
      const data = params.data as Record<string, any> | undefined;
      const token = params.token as string | undefined;

      switch (action) {
        case "start": {
          const newToken = generateOnboardingToken();
          const session: OnboardingSession = {
            token: newToken,
            createdAt: Date.now(),
            expiresAt: Date.now() + 30 * 60 * 1000,
            step: "welcome",
            config: createDefaultConfig(),
          };

          onboardingSessions.set(newToken, session);

          respond(true, {
            success: true,
            step: "welcome",
            progress: 0,
            nextStep: "auth",
            token: newToken,
            message: "Welcome to OpenClaw! Let's get you set up.",
          } as OnboardingWizardResponse);
          break;
        }

        case "status": {
          if (!token) {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "Token required"));
            return;
          }

          const session = onboardingSessions.get(token);
          if (!session || Date.now() > session.expiresAt) {
            respond(
              false,
              undefined,
              errorShape(ErrorCodes.INVALID_REQUEST, "Invalid or expired session"),
            );
            return;
          }

          respond(true, {
            success: true,
            step: session.step,
            progress: calculateProgress(session.step),
            config: session.config,
          } as OnboardingWizardResponse);
          break;
        }

        case "next": {
          if (!token) {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "Token required"));
            return;
          }

          const session = onboardingSessions.get(token);
          if (!session || Date.now() > session.expiresAt) {
            respond(
              false,
              undefined,
              errorShape(ErrorCodes.INVALID_REQUEST, "Invalid or expired session"),
            );
            return;
          }

          const steps: OnboardingStep[] = ["welcome", "auth", "channels", "features", "complete"];
          const currentIndex = steps.indexOf(session.step);

          if (currentIndex < steps.length - 1) {
            session.step = steps[currentIndex + 1];
          }

          respond(true, {
            success: true,
            step: session.step,
            progress: calculateProgress(session.step),
            prevStep: steps[currentIndex],
            nextStep: currentIndex + 2 < steps.length ? steps[currentIndex + 2] : undefined,
            config: session.config,
          } as OnboardingWizardResponse);
          break;
        }

        case "prev": {
          if (!token) {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "Token required"));
            return;
          }

          const session = onboardingSessions.get(token);
          if (!session || Date.now() > session.expiresAt) {
            respond(
              false,
              undefined,
              errorShape(ErrorCodes.INVALID_REQUEST, "Invalid or expired session"),
            );
            return;
          }

          const steps: OnboardingStep[] = ["welcome", "auth", "channels", "features", "complete"];
          const currentIndex = steps.indexOf(session.step);

          if (currentIndex > 0) {
            session.step = steps[currentIndex - 1];
          }

          respond(true, {
            success: true,
            step: session.step,
            progress: calculateProgress(session.step),
            prevStep: currentIndex > 1 ? steps[currentIndex - 2] : undefined,
            nextStep: steps[currentIndex],
            config: session.config,
          } as OnboardingWizardResponse);
          break;
        }

        case "update": {
          if (!token) {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "Token required"));
            return;
          }

          const session = onboardingSessions.get(token);
          if (!session || Date.now() > session.expiresAt) {
            respond(
              false,
              undefined,
              errorShape(ErrorCodes.INVALID_REQUEST, "Invalid or expired session"),
            );
            return;
          }

          if (session.step === "auth" && data) {
            if (data.provider && data.apiKey) {
              const isValid = await validateApiKey(data.provider, data.apiKey);
              if (!isValid) {
                respond(
                  false,
                  undefined,
                  errorShape(ErrorCodes.INVALID_REQUEST, "Invalid API key format"),
                );
                return;
              }

              // Store auth info in session
              session.config.auth = session.config.auth || {};
              session.config.auth.provider = data.provider;
              session.config.auth.apiKey = "[REDACTED]";
            }
          } else if (session.step === "channels" && data?.channels) {
            session.config.channels = session.config.channels || {};
            for (const channel of data.channels) {
              session.config.channels[channel] = { enabled: true };
            }
          } else if (session.step === "features" && data?.features) {
            session.config.features = session.config.features || {};
            for (const feature of data.features) {
              session.config.features[feature] = { enabled: true };
            }
          }

          respond(true, {
            success: true,
            step: session.step,
            progress: calculateProgress(session.step),
            config: session.config,
          } as OnboardingWizardResponse);
          break;
        }

        case "complete": {
          if (!token) {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "Token required"));
            return;
          }

          const session = onboardingSessions.get(token);
          if (!session || Date.now() > session.expiresAt) {
            respond(
              false,
              undefined,
              errorShape(ErrorCodes.INVALID_REQUEST, "Invalid or expired session"),
            );
            return;
          }

          try {
            const existingConfig = loadConfig();

            // Merge configs
            const finalConfig = {
              ...existingConfig,
              ...session.config,
              gateway: {
                ...existingConfig.gateway,
                ...session.config.gateway,
              },
            };

            await writeConfigFile(finalConfig);

            onboardingSessions.delete(token);

            respond(true, {
              success: true,
              step: "complete",
              progress: 100,
              message: "Setup complete! OpenClaw is ready to use.",
            } as OnboardingWizardResponse);
          } catch (err) {
            respond(
              false,
              undefined,
              errorShape(
                ErrorCodes.INTERNAL_ERROR,
                `Failed to save configuration: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );
          }
          break;
        }

        default: {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, `Unknown action: ${action}`),
          );
        }
      }
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Onboarding error: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};
