import type { GatewayBrowserClient } from "../gateway";

export type OnboardingWizardStep = "welcome" | "auth" | "channels" | "features" | "complete";

export type OnboardingState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  // Wizard state
  onboardingStep: OnboardingWizardStep;
  onboardingProgress: number;
  onboardingAuthProvider: string | null;
  onboardingApiKey: string | null;
  onboardingChannels: string[];
  onboardingFeatures: string[];
  onboardingSessionToken: string | null;
  onboardingLoading: boolean;
  onboardingError: string | null;
};

const STEP_PROGRESS: Record<OnboardingWizardStep, number> = {
  welcome: 0,
  auth: 25,
  channels: 50,
  features: 75,
  complete: 100,
};

const STEP_ORDER: OnboardingWizardStep[] = ["welcome", "auth", "channels", "features", "complete"];

export function createOnboardingController(state: OnboardingState) {
  return {
    setOnboardingAuthProvider: (provider: string) => {
      state.onboardingAuthProvider = provider;
      state.onboardingError = null;
    },

    setOnboardingApiKey: (key: string) => {
      state.onboardingApiKey = key;
      state.onboardingError = null;
    },

    toggleOnboardingChannel: (channel: string) => {
      const idx = state.onboardingChannels.indexOf(channel);
      if (idx >= 0) {
        state.onboardingChannels.splice(idx, 1);
      } else {
        state.onboardingChannels.push(channel);
      }
    },

    toggleOnboardingFeature: (feature: string) => {
      const idx = state.onboardingFeatures.indexOf(feature);
      if (idx >= 0) {
        state.onboardingFeatures.splice(idx, 1);
      } else {
        state.onboardingFeatures.push(feature);
      }
    },

    onboardingNextStep: async () => {
      const currentIdx = STEP_ORDER.indexOf(state.onboardingStep);
      if (currentIdx < STEP_ORDER.length - 1) {
        const nextStep = STEP_ORDER[currentIdx + 1];
        
        // Save current step progress to backend if needed
        if (state.client && state.connected && state.onboardingSessionToken) {
          try {
            state.onboardingLoading = true;
            await state.client.request("onboard.wizard", {
              action: "next",
              token: state.onboardingSessionToken,
              data: {
                provider: state.onboardingAuthProvider,
                apiKey: state.onboardingAuthProvider === "ollama" ? null : state.onboardingApiKey,
                channels: state.onboardingChannels,
                features: state.onboardingFeatures,
              },
            });
          } catch (err) {
            state.onboardingError = String(err);
            state.onboardingLoading = false;
            return;
          } finally {
            state.onboardingLoading = false;
          }
        }
        
        state.onboardingStep = nextStep;
        state.onboardingProgress = STEP_PROGRESS[nextStep];
        state.onboardingError = null;
      }
    },

    onboardingPrevStep: () => {
      const currentIdx = STEP_ORDER.indexOf(state.onboardingStep);
      if (currentIdx > 0) {
        const prevStep = STEP_ORDER[currentIdx - 1];
        state.onboardingStep = prevStep;
        state.onboardingProgress = STEP_PROGRESS[prevStep];
        state.onboardingError = null;
      }
    },

    completeOnboarding: async () => {
      if (!state.client || !state.connected || !state.onboardingSessionToken) {
        state.onboardingError = "Not connected to gateway";
        return;
      }

      try {
        state.onboardingLoading = true;
        await state.client.request("onboard.wizard", {
          action: "complete",
          token: state.onboardingSessionToken,
          data: {
            provider: state.onboardingAuthProvider,
            apiKey: state.onboardingAuthProvider === "ollama" ? null : state.onboardingApiKey,
            channels: state.onboardingChannels,
            features: state.onboardingFeatures,
          },
        });
        
        // Clear onboarding state and navigate to chat
        state.onboardingStep = "complete";
        state.onboardingProgress = 100;
        state.onboardingError = null;
      } catch (err) {
        state.onboardingError = String(err);
      } finally {
        state.onboardingLoading = false;
      }
    },

    startOnboarding: async () => {
      if (!state.client || !state.connected) {
        state.onboardingError = "Not connected to gateway";
        return;
      }

      try {
        state.onboardingLoading = true;
        state.onboardingError = null;
        
        const res = await state.client.request("onboard.wizard", {
          action: "start",
        }) as { token?: string; step?: string; progress?: number };
        
        if (res?.token) {
          state.onboardingSessionToken = res.token;
        }
        
        // Initialize with defaults
        state.onboardingStep = (res?.step as OnboardingWizardStep) || "welcome";
        state.onboardingProgress = res?.progress ?? 0;
        state.onboardingAuthProvider = null;
        state.onboardingApiKey = null;
        state.onboardingChannels = [];
        state.onboardingFeatures = ["voice_recorder", "tts", "web_search"];
      } catch (err) {
        state.onboardingError = String(err);
      } finally {
        state.onboardingLoading = false;
      }
    },
  };
}

export function getDefaultOnboardingFeatures(): string[] {
  return ["voice_recorder", "tts", "web_search"];
}
