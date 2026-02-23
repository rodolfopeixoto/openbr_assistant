//! OpenClaw Rust Core - N-API Bindings
//!
//! This module provides Rust implementations for performance-critical operations
//! exposed to Node.js via N-API.

use napi::bindgen_prelude::*;

pub mod cache;
pub mod crypto;
pub mod image;
pub mod json;

/// Initialize the Rust runtime and logging
#[napi]
pub fn init_rust_runtime() {
    // Initialize tracing for structured logging
    tracing_subscriber::fmt().with_env_filter("info").init();
}

/// Get version information
#[napi]
pub fn get_rust_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Benchmark helper - run a function multiple times and return average
#[napi]
pub fn benchmark<F: Fn() -> T, T>(f: F, iterations: u32) -> f64
where
    F: std::ops::Fn() -> T,
{
    let start = std::time::Instant::now();

    for _ in 0..iterations {
        let _ = f();
    }

    let elapsed = start.elapsed();
    elapsed.as_secs_f64() / iterations as f64
}

/// Check if SIMD is available
#[napi]
pub fn has_simd_support() -> bool {
    #[cfg(target_arch = "x86_64")]
    {
        is_x86_feature_detected!("sse2") || is_x86_feature_detected!("avx2")
    }

    #[cfg(target_arch = "aarch64")]
    {
        true // AArch64 always has NEON
    }

    #[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64")))]
    {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        let version = get_rust_version();
        assert!(!version.is_empty());
        assert!(version.contains('.'));
    }

    #[test]
    fn test_simd_detection() {
        // Just make sure it doesn't panic
        let _has_simd = has_simd_support();
    }
}
