import type { IncomingMessage, ServerResponse } from "node:http";
import crypto from "node:crypto";

export interface CsrfConfig {
  cookieName: string;
  headerName: string;
  tokenLength: number;
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict" | "lax" | "none";
    maxAge: number;
  };
}

const DEFAULT_CSRF_CONFIG: CsrfConfig = {
  cookieName: "XSRF-TOKEN",
  headerName: "X-XSRF-TOKEN",
  tokenLength: 32,
  cookieOptions: {
    httpOnly: false,
    secure: true,
    sameSite: "strict",
    maxAge: 86400000,
  },
};

export class CsrfProtection {
  private config: CsrfConfig;

  constructor(config: Partial<CsrfConfig> = {}) {
    this.config = { ...DEFAULT_CSRF_CONFIG, ...config };
  }

  generateToken(): string {
    return crypto.randomBytes(this.config.tokenLength).toString("base64url");
  }

  setTokenCookie(res: ServerResponse, token: string): void {
    const cookie =
      `${this.config.cookieName}=${token}; ` +
      `Path=/; ` +
      `${this.config.cookieOptions.httpOnly ? "HttpOnly; " : ""}` +
      `${this.config.cookieOptions.secure ? "Secure; " : ""}` +
      `SameSite=${this.config.cookieOptions.sameSite}; ` +
      `Max-Age=${this.config.cookieOptions.maxAge / 1000}`;

    res.setHeader("Set-Cookie", cookie);
  }

  validateToken(req: IncomingMessage): boolean {
    // Skip for safe methods
    if (["GET", "HEAD", "OPTIONS"].includes(req.method || "")) {
      return true;
    }

    const cookieHeader = req.headers.cookie || "";
    const cookieToken = this.extractCookieValue(cookieHeader, this.config.cookieName);

    const headerToken = req.headers[this.config.headerName.toLowerCase()] as string;

    if (!cookieToken || !headerToken) {
      return false;
    }

    // Constant-time comparison
    return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  }

  private extractCookieValue(cookieHeader: string, name: string): string | null {
    const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
  }
}
