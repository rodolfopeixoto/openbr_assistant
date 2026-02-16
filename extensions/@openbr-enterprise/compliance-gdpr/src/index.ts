/**
 * GDPR Compliance Extension
 * General Data Protection Regulation compliance module
 */

export { DataExport } from './data-export/index.js';
export { RightToErasure } from './right-to-erasure/index.js';
export { ConsentManager } from './consent-manager/index.js';
export { registerGdprChecks } from './checks/index.js';

// Auto-register checks when imported
import { registerGdprChecks } from './checks/index.js';
registerGdprChecks();

// Version
export const VERSION = '1.0.0';

// Extension metadata for OpenClaw
export const metadata = {
  name: '@openbr-enterprise/compliance-gdpr',
  version: VERSION,
  description: 'GDPR compliance checking and enforcement',
  hooks: {
    onInit: registerGdprChecks
  }
};
