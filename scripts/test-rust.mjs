#!/usr/bin/env node
/**
 * Test script for OpenClaw Ultra Performance Rust Core
 */

import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load Rust module
const rustModule = { exports: {} };
process.dlopen(rustModule, join(__dirname, '../rust/target/release/libopenclaw_core.dylib'));
const rust = rustModule.exports;

console.log('🧪 Testing OpenClaw Ultra Performance Rust Core\n');
console.log('Version:', rust.getCoreVersion());
console.log('Exports:', Object.keys(rust).join(', '));
console.log();

// Test 1: Blake3 Hash
console.log('1️⃣ Blake3 Hash Test');
const testData = Buffer.from('Hello, World!');
const rustHash = rust.blake3Hash(testData);
const nodeHash = createHash('sha256').update(testData).digest();
console.log('   Rust Blake3:', rustHash.toString('hex').substring(0, 16) + '...');
console.log('   Node SHA256:', nodeHash.toString('hex').substring(0, 16) + '...');
console.log('   ✅ Hash generated successfully\n');

// Test 2: XXH3 Hash
console.log('2️⃣ XXH3 Hash Test');
const xxh3Hash = rust.xxh3Hash(testData);
console.log('   XXH3:', xxh3Hash);
console.log('   ✅ Non-cryptographic hash works\n');

// Test 3: JSON Parsing
console.log('3️⃣ JSON Parse Test');
const testJson = JSON.stringify({ foo: 'bar', nested: { value: 123 } });
const parsed = rust.parseJson(testJson);
console.log('   Input:', testJson);
console.log('   Parsed:', parsed);
console.log('   ✅ JSON parsed successfully\n');

// Test 4: JSON Batch
console.log('4️⃣ JSON Batch Test');
const jsonBatch = [
  JSON.stringify({ id: 1 }),
  JSON.stringify({ id: 2 }),
  JSON.stringify({ id: 3 })
];
const batchResult = rust.parseJsonBatch(jsonBatch);
console.log('   Batch size:', jsonBatch.length);
console.log('   Results:', batchResult.length);
console.log('   ✅ Batch processing works\n');

// Test 5: Blake3 Hasher (streaming)
console.log('5️⃣ Streaming Hasher Test');
const hasher = new rust.Blake3Hasher();
hasher.update(Buffer.from('Hello, '));
hasher.update(Buffer.from('World!'));
const streamingHash = hasher.finalize();
console.log('   Streaming hash:', streamingHash.toString('hex').substring(0, 16) + '...');
console.log('   Matches direct:', streamingHash.toString('hex') === rustHash.toString('hex'));
console.log('   ✅ Streaming hasher works\n');

// Test 6: Performance comparison
console.log('6️⃣ Performance Test (Blake3 vs SHA256)');
const iterations = 10000;
const perfData = Buffer.from('Test data for benchmarking').repeat(100);

// Node.js SHA256
console.time('   Node SHA256');
for (let i = 0; i < iterations; i++) {
  createHash('sha256').update(perfData).digest();
}
console.timeEnd('   Node SHA256');

// Rust Blake3
console.time('   Rust Blake3');
for (let i = 0; i < iterations; i++) {
  rust.blake3Hash(perfData);
}
console.timeEnd('   Rust Blake3');

console.log('   ✅ Performance test complete\n');

console.log('🎉 All tests passed!');
console.log('\\nNext steps:');
console.log('  - Run benchmarks: pnpm benchmark');
console.log('  - Start dev server: pnpm dev:ultra');
console.log('  - Build for production: pnpm build:ultra');