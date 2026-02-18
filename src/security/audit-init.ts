import type { AuditLogger } from "./audit-logger.js";

let auditLogger: AuditLogger | null = null;

export function setAuditLogger(logger: AuditLogger | null): void {
  auditLogger = logger;
}

export function getAuditLogger(): AuditLogger | null {
  return auditLogger;
}
