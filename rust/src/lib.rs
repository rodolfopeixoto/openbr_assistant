use napi::bindgen_prelude::*;
use napi_derive::napi;

mod cache;
mod crypto;
mod json;

pub use cache::*;
pub use crypto::*;
pub use json::*;

/// Get version info
#[napi]
pub fn get_core_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
