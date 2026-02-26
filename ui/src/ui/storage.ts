const KEY = "openclaw.control.settings.v1";
const VERSION_KEY = "openclaw.control.settings.version";
const CURRENT_VERSION = "2.0.0"; // Bump this to force reset

import type { ThemeMode } from "./theme";

export type UiSettings = {
  gatewayUrl: string;
  token: string;
  sessionKey: string;
  lastActiveSessionKey: string;
  theme: ThemeMode;
  chatFocusMode: boolean;
  chatShowThinking: boolean;
  chatShowTools: boolean;
  splitRatio: number; // Sidebar split ratio (0.4 to 0.7, default 0.6)
  navCollapsed: boolean; // Collapsible sidebar state
  navGroupsCollapsed: Record<string, boolean>; // Which nav groups are collapsed
};

// Default navigation groups with all features visible
const DEFAULT_NAV_GROUPS: Record<string, boolean> = {
  "Chat": false,
  "Control": false,
  "Intelligence": false,
  "Agent": false,
  "AI": false,
  "System": false,
  "Settings": false,
};

/**
 * Reset all settings to defaults - clears localStorage
 */
export function resetAllSettings(): void {
  console.log("[Settings] Resetting all settings to defaults...");
  localStorage.removeItem(KEY);
  localStorage.removeItem(VERSION_KEY);
  // Clear any other openclaw-related keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith("openclaw.")) {
      localStorage.removeItem(key);
    }
  }
  console.log("[Settings] All settings cleared. Page will reload...");
  window.location.reload();
}

/**
 * Auto-migrate navGroupsCollapsed to ensure all groups are present
 */
function migrateNavGroups(saved: Record<string, boolean> | undefined): Record<string, boolean> {
  // If saved is empty or undefined, return defaults
  if (!saved || Object.keys(saved).length === 0) {
    console.log("[Settings] Migrating: navGroupsCollapsed empty, using defaults");
    return { ...DEFAULT_NAV_GROUPS };
  }

  // Check if all required groups are present
  const merged = { ...DEFAULT_NAV_GROUPS };
  let needsMigration = false;

  for (const [group, expanded] of Object.entries(saved)) {
    if (group in merged) {
      merged[group] = expanded;
    }
  }

  // Check if any default groups are missing
  for (const group of Object.keys(DEFAULT_NAV_GROUPS)) {
    if (!(group in saved)) {
      console.log(`[Settings] Migrating: adding missing group "${group}"`);
      merged[group] = false; // Expand by default
      needsMigration = true;
    }
  }

  if (needsMigration) {
    console.log("[Settings] Nav groups migrated successfully");
  }

  return merged;
}

export function loadSettings(): UiSettings {
  const defaultUrl = (() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}`;
  })();

  const defaults: UiSettings = {
    gatewayUrl: defaultUrl,
    token: "",
    sessionKey: "main",
    lastActiveSessionKey: "main",
    theme: "system",
    chatFocusMode: false,
    chatShowThinking: true,
    chatShowTools: false,
    splitRatio: 0.6,
    navCollapsed: false,
    navGroupsCollapsed: { ...DEFAULT_NAV_GROUPS },
  };

  try {
    // Check version - if different, reset settings
    const savedVersion = localStorage.getItem(VERSION_KEY);
    if (savedVersion !== CURRENT_VERSION) {
      console.log(`[Settings] Version changed from ${savedVersion} to ${CURRENT_VERSION}, resetting...`);
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      // Don't reset immediately, just mark for migration
    }

    const raw = localStorage.getItem(KEY);
    if (!raw) {
      console.log("[Settings] No saved settings found, using defaults");
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<UiSettings>;

    // Auto-migrate navGroupsCollapsed
    const migratedNavGroups = migrateNavGroups(parsed.navGroupsCollapsed);

    return {
      gatewayUrl:
        typeof parsed.gatewayUrl === "string" && parsed.gatewayUrl.trim()
          ? parsed.gatewayUrl.trim()
          : defaults.gatewayUrl,
      token: typeof parsed.token === "string" ? parsed.token : defaults.token,
      sessionKey:
        typeof parsed.sessionKey === "string" && parsed.sessionKey.trim()
          ? parsed.sessionKey.trim()
          : defaults.sessionKey,
      lastActiveSessionKey:
        typeof parsed.lastActiveSessionKey === "string" && parsed.lastActiveSessionKey.trim()
          ? parsed.lastActiveSessionKey.trim()
          : (typeof parsed.sessionKey === "string" && parsed.sessionKey.trim()) ||
            defaults.lastActiveSessionKey,
      theme:
        parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
          ? parsed.theme
          : defaults.theme,
      chatFocusMode:
        typeof parsed.chatFocusMode === "boolean" ? parsed.chatFocusMode : defaults.chatFocusMode,
      chatShowThinking:
        typeof parsed.chatShowThinking === "boolean"
          ? parsed.chatShowThinking
          : defaults.chatShowThinking,
      chatShowTools:
        typeof parsed.chatShowTools === "boolean"
          ? parsed.chatShowTools
          : defaults.chatShowTools,
      splitRatio:
        typeof parsed.splitRatio === "number" &&
        parsed.splitRatio >= 0.4 &&
        parsed.splitRatio <= 0.7
          ? parsed.splitRatio
          : defaults.splitRatio,
      navCollapsed:
        typeof parsed.navCollapsed === "boolean" ? parsed.navCollapsed : defaults.navCollapsed,
      navGroupsCollapsed: migratedNavGroups,
    };
  } catch (err) {
    console.error("[Settings] Failed to load settings:", err);
    return defaults;
  }
}

export function saveSettings(next: UiSettings) {
  localStorage.setItem(KEY, JSON.stringify(next));
}
