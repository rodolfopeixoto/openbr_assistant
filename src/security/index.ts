import type { OpenClawConfig } from "../config/config.js";
import { resolveConfigPath } from "../config/paths.js";
import { AUDIT_EVENTS } from "./audit-events.js";
import { setAuditLogger } from "./audit-init.js";
import { AuditLogger, type AuditLoggerConfig } from "./audit-logger.js";

export interface AuditInitResult {
  logger: AuditLogger;
  enabled: boolean;
}

export function initializeAuditLogging(config: OpenClawConfig): AuditInitResult {
  const auditConfig = config.gateway?.audit;

  if (auditConfig?.enabled === false) {
    return { logger: new AuditLogger({ logDir: "/dev/null" }), enabled: false };
  }

  const loggerConfig: Partial<AuditLoggerConfig> = {
    bufferSize: auditConfig?.bufferSize ?? 1000,
    flushInterval: auditConfig?.flushInterval ?? 5000,
    logDir: auditConfig?.logDir
      ? resolveConfigPath(auditConfig.logDir)
      : resolveConfigPath("~/.openclaw/logs/audit"),
    encrypt: auditConfig?.encrypt ?? false,
  };

  const logger = new AuditLogger(loggerConfig);
  setAuditLogger(logger);

  // Log gateway startup
  void logger.log({
    level: "info",
    category: "system",
    action: "gateway.startup",
    actor: { type: "system" },
    resource: { type: "gateway" },
    result: "success",
    details: {
      port: config.gateway?.port,
      mode: config.gateway?.mode,
      bind: config.gateway?.bind,
    },
  });

  return { logger, enabled: true };
}

export { AuditLogger, AUDIT_EVENTS };
export type { AuditEvent, AuditLoggerConfig } from "./audit-logger.js";
