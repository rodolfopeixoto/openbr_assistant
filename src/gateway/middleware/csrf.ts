import type { IncomingMessage, ServerResponse } from "node:http";
import { CsrfProtection } from "../csrf.js";

export function csrfMiddleware(csrfProtection: CsrfProtection) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    // Generate and set token for GET requests
    if (req.method === "GET") {
      const token = csrfProtection.generateToken();
      csrfProtection.setTokenCookie(res, token);
      return next();
    }

    // Validate for state-changing requests
    if (!csrfProtection.validateToken(req)) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "CSRF token validation failed",
          code: "CSRF_INVALID",
        }),
      );
      return;
    }

    next();
  };
}
