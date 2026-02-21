export const AUDIT_EVENTS = {
  AUTH: {
    LOGIN_SUCCESS: "auth.login.success",
    LOGIN_FAILURE: "auth.login.failure",
    LOGOUT: "auth.logout",
    TOKEN_REFRESH: "auth.token.refresh",
  },
  ACCESS: {
    PERMISSION_DENIED: "access.permission.denied",
    RESOURCE_ACCESS: "access.resource",
  },
  SECURITY: {
    RATE_LIMIT_HIT: "security.rate_limit.hit",
    CSRF_FAILURE: "security.csrf.failure",
    INJECTION_DETECTED: "security.injection.detected",
  },
} as const;

// Base audit event types
export interface AuditEventBase {
  type: string;
  timestamp: string;
  outcome: AuditOutcome;
}

export type AuditOutcome = "success" | "failure" | "blocked" | "warning";
