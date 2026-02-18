import type { IncomingMessage, ServerResponse } from "node:http";

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  allowCredentials: boolean;
  maxAge: number;
}

const DEFAULT_CORS_CONFIG: CorsConfig = {
  allowedOrigins: [],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-OpenClaw-Token"],
  allowCredentials: false,
  maxAge: 86400,
};

export function createCorsHandler(config: CorsConfig = DEFAULT_CORS_CONFIG) {
  return function handleCors(req: IncomingMessage, res: ServerResponse, origin: string): boolean {
    if (!isOriginAllowed(origin, config.allowedOrigins)) {
      return false;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", config.allowedMethods.join(", "));
    res.setHeader("Access-Control-Allow-Headers", config.allowedHeaders.join(", "));
    res.setHeader("Access-Control-Max-Age", config.maxAge.toString());

    if (config.allowCredentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return true;
    }

    return true;
  };
}

function isOriginAllowed(origin: string, allowed: string[]): boolean {
  if (allowed.length === 0) {
    return false;
  }
  if (allowed.includes("*")) {
    return true;
  }

  return allowed.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(origin);
    }
    return pattern === origin;
  });
}
