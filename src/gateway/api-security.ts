import type { IncomingMessage, ServerResponse } from "node:http";

export interface APIEndpointConfig {
  path: string;
  methods: string[];
  authRequired: boolean;
  validation?: {
    body?: object;
    query?: object;
    params?: object;
  };
}

export class APISecurity {
  private endpoints = new Map<string, APIEndpointConfig>();

  registerEndpoint(config: APIEndpointConfig): void {
    const key = `${config.methods.join(",")}:${config.path}`;
    this.endpoints.set(key, config);
  }

  sanitizeInput(input: string, context: "url" | "body" | "query" = "body"): string {
    // XSS prevention
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");

    // SQL injection basic prevention
    // Only remove -- in body/query context, not in URLs (to support filenames like index-CX--0dux.css)
    if (context !== "url") {
      sanitized = sanitized.replace(/(['";\\])/g, "\\$1").replace(/--/g, "");
    } else {
      // For URLs, only escape quotes but don't remove --
      sanitized = sanitized.replace(/(['";\\])/g, "\\$1");
    }

    // Path traversal prevention
    sanitized = sanitized.replace(/\.\.\//g, "").replace(/~\//g, "");

    return sanitized;
  }

  validateJSON(input: string): boolean {
    try {
      JSON.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  middleware() {
    return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      // Sanitize URL
      if (req.url) {
        req.url = this.sanitizeInput(req.url, "url");
      }

      // Validate content type for POST/PUT
      if (["POST", "PUT", "PATCH"].includes(req.method || "")) {
        const contentType = req.headers["content-type"] || "";

        if (contentType.includes("application/json")) {
          // Will validate in body parser
        } else if (!contentType.includes("multipart/form-data")) {
          // Reject unknown content types
          res.statusCode = 415;
          res.end(JSON.stringify({ error: "Unsupported Media Type" }));
          return;
        }
      }

      next();
    };
  }
}

// Security composition middleware
export function createSecurityMiddleware() {
  const apiSecurity = new APISecurity();

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    // Apply API security
    await new Promise<void>((resolve) => {
      apiSecurity.middleware()(req, res, () => resolve());
    });

    next();
  };
}
