import type { KeyringAdapter } from "./adapter.js";
import { MacOSKeychainAdapter } from "./macos.js";

export { type KeyringAdapter } from "./adapter.js";

export function getPlatformKeyring(): KeyringAdapter | null {
  switch (process.platform) {
    case "darwin":
      return new MacOSKeychainAdapter();
    case "win32":
      // TODO: Implement Windows Credential Manager adapter
      return null;
    case "linux":
      // TODO: Implement Linux Secret Service adapter (libsecret)
      return null;
    default:
      return null;
  }
}
