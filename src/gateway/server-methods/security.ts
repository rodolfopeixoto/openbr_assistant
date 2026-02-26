import type { GatewayRequestHandlers } from "./types.js";
import { SecurityScanner } from "../../services/security/scanner.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

const scanner = new SecurityScanner();
let lastScan: any = null;

export const securityHandlers: GatewayRequestHandlers = {
  "security.status": async ({ respond }) => {
    try {
      // Retornar último scan ou fazer um scan rápido
      if (!lastScan) {
        lastScan = await scanner.runFullScan();
      }

      respond(true, {
        score: lastScan.score,
        grade: lastScan.grade,
        lastScan: lastScan.timestamp,
        summary: lastScan.summary,
        scanInProgress: false,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get security status: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "security.scan": async ({ respond }) => {
    try {
      lastScan = await scanner.runFullScan();

      respond(true, {
        success: true,
        message: "Security scan completed",
        result: lastScan,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to run security scan: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "security.vulnerabilities": async ({ params, respond }) => {
    const { severity, category } = params as { severity?: string; category?: string };

    try {
      if (!lastScan) {
        lastScan = await scanner.runFullScan();
      }

      let vulns = lastScan.vulnerabilities;

      if (severity) {
        vulns = vulns.filter((v: any) => v.severity === severity);
      }

      if (category) {
        vulns = vulns.filter((v: any) => v.category === category);
      }

      respond(true, { vulnerabilities: vulns });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get vulnerabilities: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "security.secrets": async ({ respond }) => {
    try {
      if (!lastScan) {
        lastScan = await scanner.runFullScan();
      }

      respond(true, { secrets: lastScan.secrets });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get secrets: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "security.fix": async ({ params, respond }) => {
    const { vulnerabilityId } = params as { vulnerabilityId: string };

    try {
      if (!lastScan) {
        return respond(
          false,
          undefined,
          errorShape(ErrorCodes.INTERNAL_ERROR, "No scan data available. Run a scan first."),
        );
      }

      const vuln = lastScan.vulnerabilities.find((v: any) => v.id === vulnerabilityId);
      if (!vuln) {
        return respond(
          false,
          undefined,
          errorShape(ErrorCodes.INTERNAL_ERROR, "Vulnerability not found"),
        );
      }

      if (!vuln.autoFixable || !vuln.fixCommand) {
        return respond(
          false,
          undefined,
          errorShape(ErrorCodes.INTERNAL_ERROR, "This vulnerability cannot be auto-fixed"),
        );
      }

      // Executar comando de fix
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      await execAsync(vuln.fixCommand);

      // Re-scan
      lastScan = await scanner.runFullScan();

      respond(true, {
        success: true,
        message: `Fixed vulnerability: ${vuln.title}`,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to fix vulnerability: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};
