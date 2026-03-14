<<<<<<< HEAD
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
=======
import path from "node:path";
import { describe, expect, it } from "vitest";
>>>>>>> origin/fix/security-sanitize-env-vars
import { resolveWhatsAppAuthDir } from "./accounts.js";

describe("resolveWhatsAppAuthDir", () => {
  const stubCfg = { channels: { whatsapp: { accounts: {} } } } as Parameters<
    typeof resolveWhatsAppAuthDir
  >[0]["cfg"];
<<<<<<< HEAD
  let prevOauthDir: string | undefined;
  let tempOauthDir: string;

  beforeEach(() => {
    prevOauthDir = process.env.OPENCLAW_OAUTH_DIR;
    tempOauthDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-auth-"));
    process.env.OPENCLAW_OAUTH_DIR = tempOauthDir;
  });

  afterEach(() => {
    if (prevOauthDir === undefined) {
      delete process.env.OPENCLAW_OAUTH_DIR;
    } else {
      process.env.OPENCLAW_OAUTH_DIR = prevOauthDir;
    }
  });
=======
>>>>>>> origin/fix/security-sanitize-env-vars

  it("sanitizes path traversal sequences in accountId", () => {
    const { authDir } = resolveWhatsAppAuthDir({
      cfg: stubCfg,
      accountId: "../../../etc/passwd",
    });
<<<<<<< HEAD
    const baseDir = path.join(tempOauthDir, "whatsapp");
    const relative = path.relative(baseDir, authDir);
    // Sanitized accountId must stay under the whatsapp auth directory.
    expect(relative.startsWith("..")).toBe(false);
    expect(path.isAbsolute(relative)).toBe(false);
=======
    // Sanitized accountId must not escape the whatsapp auth directory.
    expect(authDir).not.toContain("..");
    expect(path.basename(authDir)).not.toContain("/");
>>>>>>> origin/fix/security-sanitize-env-vars
  });

  it("sanitizes special characters in accountId", () => {
    const { authDir } = resolveWhatsAppAuthDir({
      cfg: stubCfg,
      accountId: "foo/bar\\baz",
    });
<<<<<<< HEAD
    // Check sanitization on the accountId segment, not the full path (Windows uses backslash).
    const segment = path.basename(authDir);
    expect(segment).not.toContain("/");
    expect(segment).not.toContain("\\");
    expect(segment).toBe("foo-bar-baz");
=======
    // Sprawdzaj sanityzacje na segmencie accountId, nie na calej sciezce
    // (Windows uzywa backslash jako separator katalogow).
    const segment = path.basename(authDir);
    expect(segment).not.toContain("/");
    expect(segment).not.toContain("\\");
>>>>>>> origin/fix/security-sanitize-env-vars
  });

  it("returns default directory for empty accountId", () => {
    const { authDir } = resolveWhatsAppAuthDir({
      cfg: stubCfg,
      accountId: "",
    });
    expect(authDir).toMatch(/whatsapp[/\\]default$/);
  });

  it("preserves valid accountId unchanged", () => {
    const { authDir } = resolveWhatsAppAuthDir({
      cfg: stubCfg,
      accountId: "my-account-1",
    });
    expect(authDir).toMatch(/whatsapp[/\\]my-account-1$/);
  });
<<<<<<< HEAD

  it("keeps legacy casing when a matching auth directory exists", () => {
    const legacyDir = path.join(tempOauthDir, "whatsapp", "Work");
    fs.mkdirSync(legacyDir, { recursive: true });
    const { authDir } = resolveWhatsAppAuthDir({
      cfg: stubCfg,
      accountId: "Work",
    });
    expect(authDir).toBe(legacyDir);
  });
=======
>>>>>>> origin/fix/security-sanitize-env-vars
});
