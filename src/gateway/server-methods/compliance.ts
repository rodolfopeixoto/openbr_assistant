import type { GatewayRequestHandlers } from "./types.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import { formatError } from "../server-utils.js";

// Compliance types
type ComplianceFramework = "gdpr" | "lgpd" | "soc2" | "hipaa";
type ComplianceSeverity = "critical" | "high" | "medium" | "low";
type ViolationStatus = "open" | "acknowledged" | "resolved";

interface ComplianceViolation {
  id: string;
  framework: ComplianceFramework;
  severity: ComplianceSeverity;
  status: ViolationStatus;
  title: string;
  description: string;
  resource?: string;
  detectedAt: string;
  resolvedAt?: string;
  remediation?: string;
  checkId: string;
}

interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  severity: ComplianceSeverity;
  framework: ComplianceFramework;
  check(): Promise<ComplianceViolation | null>;
}

interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  generatedAt: string;
  status: "compliant" | "at-risk" | "non-compliant";
  score: number;
  violationsCount: number;
  summary: string;
  details: Record<string, unknown>;
  violations: ComplianceViolation[];
}

// In-memory storage
const reports = new Map<string, ComplianceReport>();
const violations: ComplianceViolation[] = [];
let lastScanAt: string | null = null;

// ============ COMPLIANCE CHECKS ============

const checks: ComplianceCheck[] = [
  // GDPR Checks
  {
    id: "gdpr-encryption",
    name: "Data Encryption at Rest",
    description: "Verifies that personal data is encrypted when stored",
    severity: "high",
    framework: "gdpr",
    async check() {
      const isEncrypted = process.env.ENCRYPTION_AT_REST === "true";
      if (!isEncrypted) {
        return createViolation(
          "gdpr",
          "high",
          "Personal Data Not Encrypted at Rest",
          "User personal data is stored without encryption, violating GDPR Article 32.",
          "gdpr-encryption",
          "Enable encryption at rest for all databases and file storage.",
        );
      }
      return null;
    },
  },
  {
    id: "gdpr-consent",
    name: "Consent Management",
    description: "Verifies consent management is configured",
    severity: "critical",
    framework: "gdpr",
    async check() {
      const hasConsent = process.env.CONSENT_MANAGEMENT === "enabled";
      if (!hasConsent) {
        return createViolation(
          "gdpr",
          "critical",
          "Consent Management Not Implemented",
          "No consent management system detected. GDPR Article 7 requires valid consent.",
          "gdpr-consent",
          "Implement a consent management system.",
        );
      }
      return null;
    },
  },
  // LGPD Checks
  {
    id: "lgpd-dpo",
    name: "Data Protection Officer",
    description: "Verifies DPO is designated",
    severity: "high",
    framework: "lgpd",
    async check() {
      const hasDPO = process.env.LGPD_DPO_NAME !== undefined;
      if (!hasDPO) {
        return createViolation(
          "lgpd",
          "high",
          "DPO Not Designated",
          "LGPD Article 41 requires designation of a Data Protection Officer.",
          "lgpd-dpo",
          "Designate a DPO and register with ANPD.",
        );
      }
      return null;
    },
  },
  // SOC2 Checks
  {
    id: "soc2-access-control",
    name: "Access Control Logs",
    description: "Verifies access control audit logging",
    severity: "medium",
    framework: "soc2",
    async check() {
      const hasLogs = process.env.ACCESS_CONTROL_LOGS === "enabled";
      if (!hasLogs) {
        return createViolation(
          "soc2",
          "medium",
          "Access Control Logs Missing",
          "Admin access changes are not being logged for SOC 2 compliance.",
          "soc2-access-control",
          "Enable audit logging for all access control changes.",
        );
      }
      return null;
    },
  },
  // HIPAA Checks
  {
    id: "hipaa-encryption",
    name: "PHI Encryption",
    description: "Verifies PHI is encrypted",
    severity: "critical",
    framework: "hipaa",
    async check() {
      const isEncrypted = process.env.HIPAA_ENCRYPTION === "true";
      if (!isEncrypted) {
        return createViolation(
          "hipaa",
          "critical",
          "PHI Not Encrypted",
          "Protected Health Information must be encrypted per HIPAA Security Rule.",
          "hipaa-encryption",
          "Enable encryption for all PHI data.",
        );
      }
      return null;
    },
  },
];

function createViolation(
  framework: ComplianceFramework,
  severity: ComplianceSeverity,
  title: string,
  description: string,
  checkId: string,
  remediation: string,
): ComplianceViolation {
  return {
    id: `${framework}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    framework,
    severity,
    status: "open",
    title,
    description,
    detectedAt: new Date().toISOString(),
    checkId,
    remediation,
  };
}

// ============ SCANNER FUNCTIONS ============

async function scanFramework(framework: ComplianceFramework): Promise<ComplianceReport> {
  void scanAll; // Reference to avoid unused warning

  const frameworkChecks = checks.filter((c) => c.framework === framework);
  const foundViolations: ComplianceViolation[] = [];

  for (const check of frameworkChecks) {
    try {
      const violation = await check.check();
      if (violation) {
        foundViolations.push(violation);
        violations.push(violation);
      }
    } catch (err) {
      console.error(`[Compliance] Check failed: ${check.id}`, err);
    }
  }

  const score = calculateScore(frameworkChecks.length, foundViolations.length);
  const status = determineStatus(score, foundViolations);

  const report: ComplianceReport = {
    id: `report-${framework}-${Date.now()}`,
    framework,
    generatedAt: new Date().toISOString(),
    status,
    score,
    violationsCount: foundViolations.length,
    summary: `${foundViolations.length} violations found in ${frameworkChecks.length} checks`,
    details: { checksRun: frameworkChecks.length },
    violations: foundViolations,
  };

  reports.set(report.id, report);
  lastScanAt = new Date().toISOString();

  return report;
}

async function scanAll(): Promise<ComplianceReport[]> {
  const frameworks: ComplianceFramework[] = ["gdpr", "lgpd", "soc2", "hipaa"];
  const results: ComplianceReport[] = [];

  for (const framework of frameworks) {
    const report = await scanFramework(framework);
    results.push(report);
  }

  return results;
}

function calculateScore(totalChecks: number, violationsCount: number): number {
  if (totalChecks === 0) {
    return 100;
  }
  const penalty = violationsCount * 15;
  return Math.max(0, Math.min(100, 100 - penalty));
}

function determineStatus(
  score: number,
  foundViolations: ComplianceViolation[],
): "compliant" | "at-risk" | "non-compliant" {
  const critical = foundViolations.filter((v) => v.severity === "critical").length;
  const high = foundViolations.filter((v) => v.severity === "high").length;

  if (critical > 0 || score < 50) {
    return "non-compliant";
  }
  if (high > 0 || score < 80) {
    return "at-risk";
  }
  return "compliant";
}

function getStatus() {
  const frameworkStatus: Record<
    ComplianceFramework,
    {
      status: "compliant" | "at-risk" | "non-compliant";
      score: number;
      lastAudit: string;
      violations: number;
    }
  > = {
    gdpr: { status: "compliant", score: 100, lastAudit: "", violations: 0 },
    lgpd: { status: "compliant", score: 100, lastAudit: "", violations: 0 },
    soc2: { status: "compliant", score: 100, lastAudit: "", violations: 0 },
    hipaa: { status: "compliant", score: 100, lastAudit: "", violations: 0 },
  };

  // Calculate actual status from violations
  for (const v of violations.filter((v) => v.status !== "resolved")) {
    const fw = frameworkStatus[v.framework];
    fw.violations++;
    fw.score = Math.max(0, fw.score - 15);
  }

  // Update status based on score
  for (const [_framework, data] of Object.entries(frameworkStatus)) {
    if (data.score < 50) {
      data.status = "non-compliant";
    } else if (data.score < 80) {
      data.status = "at-risk";
    }
    data.lastAudit = lastScanAt || "";
  }

  const totalViolations = violations.filter((v) => v.status !== "resolved").length;
  let overallStatus: "compliant" | "at-risk" | "non-compliant" | "pending" = "compliant";
  if (totalViolations > 5) {
    overallStatus = "non-compliant";
  } else if (totalViolations > 0) {
    overallStatus = "at-risk";
  }

  return {
    overallStatus,
    violationsCount: totalViolations,
    lastScanAt: lastScanAt || "",
    nextAuditAt: lastScanAt
      ? new Date(Date.parse(lastScanAt) + 7 * 24 * 60 * 60 * 1000).toISOString()
      : "",
    frameworks: frameworkStatus,
    recentViolations: violations.filter((v) => v.status !== "resolved").slice(0, 10),
  };
}

// ============ HANDLERS ============

export const complianceHandlers: GatewayRequestHandlers = {
  "compliance.status": async ({ respond }) => {
    try {
      const status = getStatus();
      respond(true, status, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatError(err)));
    }
  },

  "compliance.scan": async ({ respond, params }) => {
    try {
      const frameworks = params?.frameworks as ComplianceFramework[] | undefined;
      const targetFrameworks = frameworks || ["gdpr", "lgpd", "soc2", "hipaa"];
      const results: ComplianceReport[] = [];

      for (const fw of targetFrameworks) {
        const report = await scanFramework(fw);
        results.push(report);
      }

      respond(true, { reports: results }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatError(err)));
    }
  },

  "compliance.report.generate": async ({ respond, params }) => {
    try {
      const framework = (params as { framework?: ComplianceFramework })?.framework;
      if (!framework) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "framework is required"));
        return;
      }

      const report = await scanFramework(framework);
      respond(true, report, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatError(err)));
    }
  },

  "compliance.reports.list": async ({ respond }) => {
    try {
      const allReports = Array.from(reports.values()).toSorted(
        (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
      );
      respond(true, { reports: allReports }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatError(err)));
    }
  },

  "compliance.violations.list": async ({ respond, params }) => {
    try {
      let result = violations;
      const filters = params as
        | { framework?: string; status?: string; severity?: string }
        | undefined;

      if (filters?.framework) {
        result = result.filter((v) => v.framework === filters.framework);
      }
      if (filters?.status) {
        result = result.filter((v) => v.status === filters.status);
      }
      if (filters?.severity) {
        result = result.filter((v) => v.severity === filters.severity);
      }

      respond(true, { violations: result }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatError(err)));
    }
  },

  "compliance.violation.acknowledge": async ({ respond, params }) => {
    try {
      const id = (params as { id?: string })?.id;
      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id is required"));
        return;
      }

      const violation = violations.find((v) => v.id === id);
      if (violation) {
        violation.status = "acknowledged";
      }

      respond(true, { success: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatError(err)));
    }
  },

  "compliance.violation.resolve": async ({ respond, params }) => {
    try {
      const id = (params as { id?: string })?.id;
      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id is required"));
        return;
      }

      const violation = violations.find((v) => v.id === id);
      if (violation) {
        violation.status = "resolved";
        violation.resolvedAt = new Date().toISOString();
      }

      respond(true, { success: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatError(err)));
    }
  },
};
