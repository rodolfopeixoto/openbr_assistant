import type { KeyringAdapter } from "./adapter.js";

export class MacOSKeychainAdapter implements KeyringAdapter {
  async getPassword(service: string, account: string): Promise<string | null> {
    try {
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execFileAsync = promisify(execFile);

      const { stdout } = await execFileAsync("security", [
        "find-generic-password",
        "-s",
        service,
        "-a",
        account,
        "-w",
      ]);
      return stdout.trim();
    } catch {
      return null;
    }
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);

    await execFileAsync("security", [
      "add-generic-password",
      "-s",
      service,
      "-a",
      account,
      "-w",
      password,
      "-U", // Update if exists
    ]);
  }

  async deletePassword(service: string, account: string): Promise<void> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);

    await execFileAsync("security", ["delete-generic-password", "-s", service, "-a", account]);
  }
}
