import type { OpenClawApp } from "../app";

export async function loadModels(host: OpenClawApp): Promise<void> {
  if (host.modelsLoading) return;
  
  host.modelsLoading = true;
  host.modelsError = null;

  try {
    // Load auth profiles from auth.list endpoint
    const authProfiles = (await host.client?.request("auth.list", {})) as {
      profiles: Array<{ id: string; provider: string; type: string }>;
    };

    // Get all available providers from models.providers endpoint
    const modelProviders = (await host.client?.request("models.providers", {})) as {
      providers: Array<{
        id: string;
        name: string;
        status: string;
        models: Array<{ id: string; name: string }>;
      }>;
    };

    // Build provider cards with configuration status
    const configuredProviderIds = new Set(
      (authProfiles?.profiles || []).map((p) => p.provider)
    );
    const providerProfiles: Record<string, Array<{ id: string; type: string }>> = {};
    (authProfiles?.profiles || []).forEach((p) => {
      if (!providerProfiles[p.provider]) {
        providerProfiles[p.provider] = [];
      }
      providerProfiles[p.provider].push({ id: p.id, type: p.type });
    });

    host.modelsProviders = (modelProviders?.providers || []).map((provider) => {
      const isConfigured = configuredProviderIds.has(provider.id);
      const profiles = providerProfiles[provider.id] || [];
      const hasError = false; // TODO: Check for errors

      return {
        id: provider.id,
        name: provider.name,
        status: hasError ? "error" : isConfigured ? "configured" : "unconfigured",
        credentialType: profiles[0]?.type as "api_key" | "oauth" | "token" | undefined,
        credentialCount: profiles.length,
        modelsCount: provider.models?.length || 0,
        lastError: undefined,
      };
    });
  } catch (err) {
    host.modelsError = String(err);
  } finally {
    host.modelsLoading = false;
  }
}
