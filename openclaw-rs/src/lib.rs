//! OpenClaw Rust Performance Modules
//! 
//! Provides high-performance Rust implementations for:
//! - Cryptographic operations
//! - JSON parsing
//! - Image processing
//! - Caching

pub mod crypto;
pub mod json;
pub mod image;
pub mod cache;

use napi::bindgen_prelude::*;

/// Initialize the Rust runtime
#[napi]
pub fn init() {
    tracing_subscriber::fmt::init();
}

/// Get version info
#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
