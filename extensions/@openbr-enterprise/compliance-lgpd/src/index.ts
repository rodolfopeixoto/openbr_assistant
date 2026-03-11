/**
 * LGPD Compliance Extension
 * Lei Geral de Proteção de Dados (Brazilian Data Protection Law)
 */

export { registerLgpdChecks } from './checks/index.js';

// Auto-register checks when imported
import { registerLgpdChecks } from './checks/index.js';
registerLgpdChecks();

// Version
export const VERSION = '1.0.0';

// Extension metadata for OpenClaw
export const metadata = {
  name: '@openbr-enterprise/compliance-lgpd',
  version: VERSION,
  description: 'LGPD compliance checking and enforcement',
  hooks: {
    onInit: registerLgpdChecks
  }
};
