/**
 * Feature flags for OpenClaw Ultra Performance
 * Enable/disable optimizations at runtime
 */

export interface UltraFeatures {
  // Core optimizations
  useBlake3: boolean; // Use Blake3 instead of SHA256
  useSimdJson: boolean; // Use simd-json for JSON parsing
  useXxh3: boolean; // Use XXH3 for non-cryptographic hashing
  useZstd: boolean; // Use Zstd compression
  useLz4: boolean; // Use LZ4 compression

  // Cache optimizations
  useNativeCache: boolean; // Use Rust LRU cache
  useBoundedHistory: boolean; // Limit group history size

  // Media optimizations
  useRustImage: boolean; // Use Rust image processing
  useStreamingPdf: boolean; // Stream PDF processing

  // Buffer optimizations
  useNativeBuffers: boolean; // Use C++ zero-copy buffers
  useSimdOps: boolean; // Use SIMD operations

  // Build optimizations
  useBundle: boolean; // Use bundled/minified code
  useSea: boolean; // Use Single Executable Application
}

// Default configuration - all optimizations enabled
export const defaultUltraFeatures: UltraFeatures = {
  useBlake3: true,
  useSimdJson: true,
  useXxh3: true,
  useZstd: true,
  useLz4: true,
  useNativeCache: true,
  useBoundedHistory: true,
  useRustImage: true,
  useStreamingPdf: true,
  useNativeBuffers: true,
  useSimdOps: true,
  useBundle: true,
  useSea: false, // Disabled by default, enable for production
};

// Legacy mode - all optimizations disabled
export const legacyFeatures: UltraFeatures = {
  useBlake3: false,
  useSimdJson: false,
  useXxh3: false,
  useZstd: false,
  useLz4: false,
  useNativeCache: false,
  useBoundedHistory: false,
  useRustImage: false,
  useStreamingPdf: false,
  useNativeBuffers: false,
  useSimdOps: false,
  useBundle: false,
  useSea: false,
};

// Load from environment
export function loadFeatures(): UltraFeatures {
  const env = process.env;

  return {
    useBlake3: env.USE_BLAKE3 !== "false",
    useSimdJson: env.USE_SIMD_JSON !== "false",
    useXxh3: env.USE_XXH3 !== "false",
    useZstd: env.USE_ZSTD !== "false",
    useLz4: env.USE_LZ4 !== "false",
    useNativeCache: env.USE_NATIVE_CACHE !== "false",
    useBoundedHistory: env.USE_BOUNDED_HISTORY !== "false",
    useRustImage: env.USE_RUST_IMAGE !== "false",
    useStreamingPdf: env.USE_STREAMING_PDF !== "false",
    useNativeBuffers: env.USE_NATIVE_BUFFERS !== "false",
    useSimdOps: env.USE_SIMD_OPS !== "false",
    useBundle: env.USE_BUNDLE === "true",
    useSea: env.USE_SEA === "true",
  };
}

// Current feature configuration
export const features = loadFeatures();

// Helper to check if a feature is enabled
export function isEnabled(feature: keyof UltraFeatures): boolean {
  return features[feature];
}
