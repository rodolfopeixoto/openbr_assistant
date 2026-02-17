#!/usr/bin/env node
/**
 * Benchmark script for OpenClaw Ultra Performance
 * Compares optimized vs legacy implementations
 */

import { bench, group, run } from 'mitata';
import { createHash } from 'node:crypto';

// Import native modules (will be built)
let rustLib;
let nativeLib;

try {
  rustLib = await import('../rust/target/release/libopenclaw_core.dylib');
} catch {
  console.log('⚠️  Rust library not built yet. Run: pnpm build:rust');
}

try {
  nativeLib = await import('../native/build/Release/openclaw_native.node');
} catch {
  console.log('⚠️  Native addon not built yet. Run: pnpm build:native');
}

const testData = Buffer.from('Hello, World! '.repeat(1000));
const testJson = JSON.stringify({ foo: 'bar', nested: { value: 123, array: [1, 2, 3] } });

// Benchmark groups
group('Hash Performance', () => {
  bench('crypto.createHash (legacy)', () => {
    createHash('sha256').update(testData).digest();
  });
  
  if (rustLib?.blake3Hash) {
    bench('blake3 (Rust)', () => {
      rustLib.blake3Hash(testData);
    });
  }
  
  if (rustLib?.xxh3Hash) {
    bench('xxh3 (Rust)', () => {
      rustLib.xxh3Hash(testData);
    });
  }
});

group('JSON Performance', () => {
  bench('JSON.parse (legacy)', () => {
    JSON.parse(testJson);
  });
  
  if (rustLib?.parseJson) {
    bench('simd-json (Rust)', () => {
      rustLib.parseJson(testJson);
    });
  }
});

group('Buffer Operations', () => {
  const buf1 = Buffer.alloc(1024);
  const buf2 = Buffer.alloc(1024);
  
  bench('Buffer.compare (legacy)', () => {
    buf1.compare(buf2);
  });
  
  if (nativeLib?.BufferOps) {
    const ops = new nativeLib.BufferOps();
    bench('native compare (C++)', () => {
      ops.compare(buf1, buf2);
    });
  }
});

// Run benchmarks
console.log('🏁 Running benchmarks...\n');
await run();

console.log('\n📊 Results saved to benchmark-results.json');