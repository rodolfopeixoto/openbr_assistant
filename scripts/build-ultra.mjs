#!/usr/bin/env node
/**
 * Build script for OpenClaw Ultra Performance
 * Compiles Rust, C++, and WASM components
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const cwd = process.cwd();

console.log('🔨 Building OpenClaw Ultra Performance...\n');

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(step, message) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
}

function error(step, message) {
  console.error(`${colors.red}[${step}]${colors.reset} ${message}`);
  process.exit(1);
}

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}\n`);
}

// Build Rust library
async function buildRust() {
  log('1/4', 'Building Rust core library...');
  
  try {
    execSync('cargo build --release', {
      cwd: join(cwd, 'rust'),
      stdio: 'inherit'
    });
    success('Rust library built successfully');
  } catch (e) {
    error('Rust', 'Failed to build Rust library');
  }
}

// Build C++ native addons
async function buildNative() {
  log('2/4', 'Building C++ native addons...');
  
  if (!existsSync(join(cwd, 'node_modules'))) {
    log('INFO', 'Installing dependencies first...');
    execSync('pnpm install', { stdio: 'inherit' });
  }
  
  try {
    execSync('npx node-gyp rebuild', {
      cwd: join(cwd, 'native'),
      stdio: 'inherit'
    });
    success('C++ native addons built successfully');
  } catch (e) {
    error('Native', 'Failed to build C++ addons');
  }
}

// Build WASM modules
async function buildWasm() {
  log('3/4', 'Building WASM modules...');
  
  try {
    // Check if wasm-pack is installed
    try {
      execSync('wasm-pack --version', { stdio: 'pipe' });
    } catch {
      log('INFO', 'Installing wasm-pack...');
      execSync('curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh', {
        stdio: 'inherit'
      });
    }
    
    // Build each WASM module
    // execSync('wasm-pack build wasm/message-router --target nodejs --release', {
    //   cwd,
    //   stdio: 'inherit'
    // });
    
    log('INFO', 'WASM build skipped (no modules yet)');
    success('WASM modules ready');
  } catch (e) {
    error('WASM', 'Failed to build WASM modules');
  }
}

// Bundle with esbuild
async function bundleApp() {
  log('4/4', 'Bundling application...');
  
  try {
    // First compile TypeScript
    execSync('pnpm build', { stdio: 'inherit' });
    
    // Then bundle
    execSync('npx esbuild dist/entry.js --bundle --outfile=dist/bundle.js --platform=node --target=node22 --minify --tree-shaking', {
      stdio: 'inherit'
    });
    
    success('Application bundled successfully');
  } catch (e) {
    error('Bundle', 'Failed to bundle application');
  }
}

// Main build process
async function main() {
  console.log(`${colors.bright}OpenClaw Ultra Performance Build${colors.reset}\n`);
  
  const startTime = Date.now();
  
  await buildRust();
  await buildNative();
  await buildWasm();
  await bundleApp();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`${colors.green}${colors.bright}`);
  console.log('╔════════════════════════════════════╗');
  console.log('║    Build completed successfully!   ║');
  console.log(`╚════════════════════════════════════╝`);
  console.log(`${colors.reset}`);
  console.log(`⏱️  Total time: ${duration}s\n`);
  
  console.log('Next steps:');
  console.log('  1. Run tests: pnpm test');
  console.log('  2. Start dev: pnpm dev:ultra');
  console.log('  3. Build SEA: pnpm build:sea\n');
}

main().catch(console.error);