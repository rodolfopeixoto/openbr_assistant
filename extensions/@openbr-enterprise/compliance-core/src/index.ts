/**
 * Compliance Core - Infrastructure for compliance frameworks
 */

export { ComplianceScanner, scanner } from './scanner/index.js';
export { ComplianceApi, complianceApi } from './api/index.js';
export type {
  ComplianceFramework,
  ComplianceSeverity,
  ViolationStatus,
  ComplianceViolation,
  ComplianceCheck,
  ComplianceReport,
  FrameworkStatus,
  ComplianceStatus,
  ComplianceConfig
} from './types/index.js';

export const VERSION = '1.0.0';
