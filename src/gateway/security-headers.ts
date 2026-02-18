import type { IncomingMessage, ServerResponse } from "node:http";

export interface SecurityHeadersConfig {
  contentSecurityPolicy: string | false;
  xFrameOptions: "DENY" | "SAMEORIGIN" | false;
  xContentTypeOptions: boolean;
  xXssProtection: boolean;
  referrerPolicy: string | false;
  permissionsPolicy: string | false;
  strictTransportSecurity: string | false;
}

const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' wss: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  xFrameOptions: "DENY",
  xContentTypeOptions: true,
  xXssProtection: true,
  referrerPolicy: "strict-origin-when-cross-origin",
  permissionsPolicy: "geolocation=(), microphone=(), camera=()",
  strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
};

export function securityHeadersMiddleware(config: Partial<SecurityHeadersConfig> = {}) {
  const finalConfig = { ...DEFAULT_SECURITY_HEADERS, ...config };

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (finalConfig.contentSecurityPolicy) {
      res.setHeader("Content-Security-Policy", finalConfig.contentSecurityPolicy);
    }

    if (finalConfig.xFrameOptions) {
      res.setHeader("X-Frame-Options", finalConfig.xFrameOptions);
    }

    if (finalConfig.xContentTypeOptions) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    }

    if (finalConfig.xXssProtection) {
      res.setHeader("X-XSS-Protection", "1; mode=block");
    }

    if (finalConfig.referrerPolicy) {
      res.setHeader("Referrer-Policy", finalConfig.referrerPolicy);
    }

    if (finalConfig.permissionsPolicy) {
      res.setHeader("Permissions-Policy", finalConfig.permissionsPolicy);
    }

    if (finalConfig.strictTransportSecurity) {
      res.setHeader("Strict-Transport-Security", finalConfig.strictTransportSecurity);
    }

    next();
  };
}
