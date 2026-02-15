/**
 * Security Core Extension
 * Enterprise-grade security features for OpenClaw
 */

export { SecretVault } from './vault/index.js';
export { SecureString } from './secure-string/index.js';
export { TokenRotation } from './token-rotation/index.js';
export { LeakDetection } from './leak-detection/index.js';
export { ChannelIsolation } from './channel-isolation/index.js';

// Version
export const VERSION = '1.0.0';
