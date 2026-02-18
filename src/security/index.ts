import * as os from "node:os";
import * as path from "node:path";
import type { OpenClawConfig } from "../config/config.js";
import { AUDIT_EVENTS } from "./audit-events.js";
import { setAuditLogger } from "./audit-init.js";
import { AuditLogger, type AuditLoggerConfig } from "./audit-logger.js";

export interface AuditInitResult {
  logger: AuditLogger;
  enabled: boolean;
}

function resolveAuditLogDir(configPath?: string): string {
  if (!configPath) {
    return path.join(os.homedir(), ".openclaw", "logs", "audit");
  }
  // Expand ~ to home directory
  if (configPath.startsWith("~/")) {
    return path.join(os.homedir(), configPath.slice(2));
  }
  return configPath;
}

export function initializeAuditLogging(config: OpenClawConfig): AuditInitResult {
  const auditConfig = config.gateway?.audit;

  if (auditConfig?.enabled === false) {
    return { logger: new AuditLogger({ logDir: "/dev/null" }), enabled: false };
  }

  const loggerConfig: Partial<AuditLoggerConfig> = {
    bufferSize: auditConfig?.bufferSize ?? 1000,
    flushInterval: auditConfig?.flushInterval ?? 5000,
    logDir: resolveAuditLogDir(auditConfig?.logDir),
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
