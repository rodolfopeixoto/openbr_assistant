/**
 * @file Security Feature Flags
 * @description Centralized feature flag system for gradual rollout of security features
 * @coordinator Central Security Team
 * @since 2025-02-18
 */

/**
 * Feature flag configuration
 * Each flag controls whether a security feature is active
 */
export interface SecurityFeatureFlags {
  // Phase 1: Core Security
  SEC001_REMOVE_DEFAULT_SECRET: boolean;
  SEC002_ARGON2ID_KDF: boolean;
  SEC003_SYSTEM_KEYRING: boolean;

  // Phase 2: API & Web Security
  SEC004_CORS_PROTECTION: boolean;
  SEC005_CSRF_PROTECTION: boolean;
  SEC006_WEBSOCKET_SECURITY: boolean;

  // Phase 3: Infrastructure
  SEC007_RATE_LIMITING: boolean;
  SEC008_SECURITY_HEADERS: boolean;
  SEC009_AUDIO_VALIDATION: boolean;

  // Phase 4: Application Security
  SEC010_UI_ACCESS_CONTROL: boolean;
  SEC011_LLM_SECURITY: boolean;
  SEC012_AUDIT_LOGGING: boolean;
  SEC013_API_SECURITY: boolean;
}

/**
 * Default flags - all disabled by default for backward compatibility
 * Flags are enabled as features are completed and tested
 */
export const DEFAULT_SECURITY_FLAGS: SecurityFeatureFlags = {
  SEC001_REMOVE_DEFAULT_SECRET: true,
  SEC002_ARGON2ID_KDF: true,
  SEC003_SYSTEM_KEYRING: false,
  SEC004_CORS_PROTECTION: true,
  SEC005_CSRF_PROTECTION: true,
  SEC006_WEBSOCKET_SECURITY: false,
  SEC007_RATE_LIMITING: true,
  SEC008_SECURITY_HEADERS: true,
  SEC009_AUDIO_VALIDATION: false,
  SEC010_UI_ACCESS_CONTROL: false,
  SEC011_LLM_SECURITY: true,
  SEC012_AUDIT_LOGGING: true,
  SEC013_API_SECURITY: false,
};

/**
 * Production flags - all security features enabled
 */
export const PRODUCTION_SECURITY_FLAGS: SecurityFeatureFlags = {
  SEC001_REMOVE_DEFAULT_SECRET: true,
  SEC002_ARGON2ID_KDF: true,
  SEC003_SYSTEM_KEYRING: true,
  SEC004_CORS_PROTECTION: true,
  SEC005_CSRF_PROTECTION: true,
  SEC006_WEBSOCKET_SECURITY: true,
  SEC007_RATE_LIMITING: true,
  SEC008_SECURITY_HEADERS: true,
  SEC009_AUDIO_VALIDATION: true,
  SEC010_UI_ACCESS_CONTROL: true,
  SEC011_LLM_SECURITY: true,
  SEC012_AUDIT_LOGGING: true,
  SEC013_API_SECURITY: true,
};

/**
 * Load security flags from environment variables
 * Format: OPENCLAW_SEC_XXX=true/false
 */
export function loadSecurityFlagsFromEnv(): Partial<SecurityFeatureFlags> {
  const flags: Partial<SecurityFeatureFlags> = {};

  for (const key of Object.keys(DEFAULT_SECURITY_FLAGS) as Array<keyof SecurityFeatureFlags>) {
    const envKey = `OPENCLAW_${key}`;
    const envValue = process.env[envKey];

    if (envValue !== undefined) {
      flags[key] = envValue.toLowerCase() === "true";
    }
  }

  return flags;
}

/**
 * Merge flags with defaults
 */
export function mergeSecurityFlags(
  overrides: Partial<SecurityFeatureFlags> = {},
): SecurityFeatureFlags {
  return {
    ...DEFAULT_SECURITY_FLAGS,
    ...loadSecurityFlagsFromEnv(),
    ...overrides,
  };
}

/**
 * Check if a specific security feature is enabled
 */
export function isSecurityFeatureEnabled(
  flags: SecurityFeatureFlags,
  feature: keyof SecurityFeatureFlags,
): boolean {
  return flags[feature] === true;
}

/**
 * Validate that all critical security features are enabled
 */
export function validateSecurityFlags(flags: SecurityFeatureFlags): {
  valid: boolean;
  missing: string[];
} {
  const criticalFeatures: Array<keyof SecurityFeatureFlags> = [
    "SEC001_REMOVE_DEFAULT_SECRET",
    "SEC002_ARGON2ID_KDF",
    "SEC007_RATE_LIMITING",
    "SEC008_SECURITY_HEADERS",
  ];

  const missing = criticalFeatures.filter((feature) => !isSecurityFeatureEnabled(flags, feature));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Feature flag checker class
 */
export class SecurityFeatureChecker {
  private flags: SecurityFeatureFlags;

  constructor(flags?: SecurityFeatureFlags) {
    this.flags = flags || mergeSecurityFlags();
  }

  isEnabled(feature: keyof SecurityFeatureFlags): boolean {
    return isSecurityFeatureEnabled(this.flags, feature);
  }

  enable(feature: keyof SecurityFeatureFlags): void {
    this.flags[feature] = true;
  }

  disable(feature: keyof SecurityFeatureFlags): void {
    this.flags[feature] = false;
  }

  getEnabledFeatures(): string[] {
    return Object.entries(this.flags)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);
  }

  validate(): { valid: boolean; missing: string[] } {
    return validateSecurityFlags(this.flags);
  }
}
