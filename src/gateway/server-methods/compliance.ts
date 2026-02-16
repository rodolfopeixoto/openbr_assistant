import type { GatewayRequestHandlers } from "./types.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import { formatError } from "../server-utils.js";

// Import compliance modules dynamically to avoid issues if extensions not installed
let complianceApi: any;
let scanner: any;

try {
  // Try to load compliance modules from extensions
  const complianceCore = await import("@openbr-enterprise/compliance-core");
  complianceApi = complianceCore.complianceApi;
  scanner = complianceCore.scanner;

  // Auto-load compliance extensions
  await import("@openbr-enterprise/compliance-gdpr");
  await import("@openbr-enterprise/compliance-lgpd");
  await import("@openbr-enterprise/compliance-soc2");
  await import("@openbr-enterprise/compliance-hipaa");
} catch {
  // Compliance extensions not installed - will return placeholder data
}

export const complianceHandlers: GatewayRequestHandlers = {
  "compliance.status": async ({ respond }) => {
    try {
      if (!scanner) {
        respond(true, getPlaceholderStatus(), undefined);
        return;
      }
      const status = scanner.getStatus();
      respond(true, status, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INTERNAL_ERROR, formatError(err)));
    }
  },

  "compliance.scan": async ({ respond, params }) => {
    try {
      if (!scanner) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.NOT_IMPLEMENTED, "Compliance extensions not installed"),
        );
        return;
      }
      const frameworks = params?.frameworks;
      const reports = await scanner.scan(frameworks);
      respond(true, { reports }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INTERNAL_ERROR, formatError(err)));
    }
  },

  "compliance.report.generate": async ({ respond, params }) => {
    try {
      if (!scanner) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.NOT_IMPLEMENTED, "Compliance extensions not installed"),
        );
        return;
      }
      const framework = params?.framework;
      if (!framework) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_PARAMS, "framework is required"));
        return;
      }
      const report = await scanner.scanFramework(framework);
      respond(true, report, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INTERNAL_ERROR, formatError(err)));
    }
  },

  "compliance.reports.list": async ({ respond, params }) => {
    try {
      if (!complianceApi) {
        respond(true, { reports: [] }, undefined);
        return;
      }
      const result = await complianceApi.handleRequest("compliance.reports.list", params || {});
      respond(true, result, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INTERNAL_ERROR, formatError(err)));
    }
  },

  "compliance.violations.list": async ({ respond, params }) => {
    try {
      if (!scanner) {
        respond(true, { violations: [] }, undefined);
        return;
      }
      const violations = scanner.getViolations(params || {});
      respond(true, { violations }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INTERNAL_ERROR, formatError(err)));
    }
  },

  "compliance.violation.acknowledge": async ({ respond, params }) => {
    try {
      if (!scanner) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.NOT_IMPLEMENTED, "Compliance extensions not installed"),
        );
        return;
      }
      const id = params?.id;
      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_PARAMS, "id is required"));
        return;
      }
      scanner.acknowledgeViolation(id);
      respond(true, { success: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INTERNAL_ERROR, formatError(err)));
    }
  },

  "compliance.violation.resolve": async ({ respond, params }) => {
    try {
      if (!scanner) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.NOT_IMPLEMENTED, "Compliance extensions not installed"),
        );
        return;
      }
      const id = params?.id;
      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_PARAMS, "id is required"));
        return;
      }
      scanner.resolveViolation(id);
      respond(true, { success: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INTERNAL_ERROR, formatError(err)));
    }
  },
};

function getPlaceholderStatus() {
  return {
    overallStatus: "pending",
    violationsCount: 0,
    lastScanAt: "",
    nextAuditAt: "",
    frameworks: {
      gdpr: { status: "pending", score: 0, lastAudit: "", violations: 0 },
      lgpd: { status: "pending", score: 0, lastAudit: "", violations: 0 },
      soc2: { status: "pending", score: 0, lastAudit: "", violations: 0 },
      hipaa: { status: "pending", score: 0, lastAudit: "", violations: 0 },
    },
    recentViolations: [],
  };
}
