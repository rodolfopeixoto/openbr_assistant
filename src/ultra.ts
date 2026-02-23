/**
 * Ultra Performance Module Loader
 * Dynamically loads optimized implementations based on feature flags
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { features, isEnabled } from "./config/features.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lazy-loaded native modules
let rustModule: any = null;
let nativeModule: any = null;
let koffi: any = null;

/**
 * Load koffi dynamically
 */
async function loadKoffi() {
  if (!koffi) {
    try {
      const koffiMod = await import("koffi");
      koffi = koffiMod.default || koffiMod;
    } catch (e) {
      // koffi not available
    }
  }
  return koffi;
}

/**
 * Initialize ultra performance modules
 */
export async function initUltra(): Promise<void> {
  console.log("🚀 Initializing OpenClaw Ultra Performance...\n");

  const koffiLib = await loadKoffi();

  // Load Rust module via koffi
  if (
    koffiLib &&
    (isEnabled("useBlake3") || isEnabled("useSimdJson") || isEnabled("useNativeCache"))
  ) {
    try {
      const rustPath = join(__dirname, "../rust/target/release/libopenclaw_core.dylib");
      if (existsSync(rustPath)) {
        rustModule = koffiLib.load(rustPath);
        console.log("✓ Rust core loaded");
      } else {
        console.warn("⚠️  Rust library not found at:", rustPath);
      }
    } catch (e) {
      console.warn("⚠️  Rust module not available, using fallbacks");
    }
  }

  // Load C++ native module via require
  if (isEnabled("useNativeBuffers") || isEnabled("useSimdOps")) {
    try {
      const nativePath = join(__dirname, "../native/build/Release/openclaw_native.node");
      if (existsSync(nativePath)) {
        nativeModule = require(nativePath);
        console.log("✓ Native addons loaded");
      } else {
        console.warn("⚠️  Native module not found at:", nativePath);
      }
    } catch (e) {
      console.warn("⚠️  Native module not available, using fallbacks");
    }
  }

  console.log("");
}

/**
 * Hash function - Blake3 or SHA256 fallback
 */
export function ultraHash(data: Buffer): Buffer {
  if (isEnabled("useBlake3") && rustModule?.blake3Hash) {
    return rustModule.blake3Hash(data);
  }

  // Fallback to Node.js crypto
  return createHash("sha256").update(data).digest();
}

/**
 * Fast non-cryptographic hash - XXH3 or fallback
 */
export function fastHash(data: Buffer): bigint {
  if (isEnabled("useXxh3") && rustModule?.xxh3Hash) {
    return BigInt(rustModule.xxh3Hash(data));
  }

  // Simple fallback hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i];
    hash |= 0;
  }
  return BigInt.asUintN(64, BigInt(hash));
}

/**
 * JSON parse - simd-json or native fallback
 */
export function ultraParseJson(json: string): any {
  if (isEnabled("useSimdJson") && rustModule?.parseJson) {
    const result = rustModule.parseJson(json);
    return JSON.parse(result); // Parse the Rust result back to JS object
  }

  return JSON.parse(json);
}

/**
 * Compress - Zstd or fallback
 */
export function ultraCompress(data: Buffer, level?: number): Buffer {
  if (isEnabled("useZstd") && rustModule?.zstdCompress) {
    return rustModule.zstdCompress(data, level ?? 3);
  }

  // Fallback: return uncompressed (or use zlib)
  return data;
}

/**
 * Decompress - Zstd or fallback
 */
export function ultraDecompress(data: Buffer): Buffer {
  if (isEnabled("useZstd") && rustModule?.zstdDecompress) {
    return rustModule.zstdDecompress(data);
  }

  return data;
}

/**
 * Get cache instance
 */
export function createCache(capacity: number, ttlSeconds: number): any {
  if (isEnabled("useNativeCache") && rustModule?.TimedCache) {
    return new rustModule.TimedCache(capacity, ttlSeconds);
  }

  // Fallback: simple JS Map with TTL simulation
  const cache = new Map<string, { value: string; expires: number }>();
  return {
    get: (key: string) => {
      const entry = cache.get(key);
      if (entry && entry.expires > Date.now()) {
        return entry.value;
      }
      if (entry) cache.delete(key);
      return undefined;
    },
    set: (key: string, value: string) => {
      cache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    },
    len: () => cache.size,
    clear: () => cache.clear(),
  };
}

/**
 * Get group history cache
 * Optimized for chat group message histories with automatic eviction
 */
export function createGroupHistoryCache(maxEntriesPerGroup: number): any {
  if (isEnabled("useNativeCache") && rustModule?.GroupHistoryCache) {
    return new rustModule.GroupHistoryCache(maxEntriesPerGroup);
  }

  // Fallback: simple JS Map with array size limit
  const cache = new Map<string, Array<{ timestamp: number; content: string }>>();
  return {
    add: (groupId: string, entry: { timestamp: number; content: string }) => {
      let history = cache.get(groupId) || [];
      history.push(entry);
      // Keep only last N entries
      if (history.length > maxEntriesPerGroup) {
        history = history.slice(-maxEntriesPerGroup);
      }
      cache.set(groupId, history);
    },
    get: (groupId: string) => cache.get(groupId) || [],
    clearGroup: (groupId: string) => cache.delete(groupId),
    len: () => cache.size,
  };
}

/**
 * Buffer operations
 */
export function compareBuffers(buf1: Buffer, buf2: Buffer): number {
  if (isEnabled("useNativeBuffers") && nativeModule?.BufferOps) {
    const ops = new nativeModule.BufferOps();
    return ops.compare(buf1, buf2);
  }

  return buf1.compare(buf2);
}

// Re-export feature flags
export { features, isEnabled } from "./config/features.js";
