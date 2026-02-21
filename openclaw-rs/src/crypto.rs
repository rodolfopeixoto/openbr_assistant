//! Cryptographic operations module
//!
//! Provides high-performance hashing and encryption

use base64::{engine::general_purpose, Engine as _};
use napi::bindgen_prelude::*;
use ring::digest::{Context, SHA256, SHA384, SHA512};

/// Hash algorithms
#[napi]
pub enum HashAlgorithm {
    Sha256,
    Sha384,
    Sha512,
}

/// Compute SHA256 hash
#[napi]
pub fn sha256(input: String) -> String {
    let digest = ring::digest::digest(&SHA256, input.as_bytes());
    hex::encode(digest.as_ref())
}

/// Compute hash with specified algorithm
#[napi]
pub fn hash(input: String, algorithm: HashAlgorithm) -> String {
    let digest = match algorithm {
        HashAlgorithm::Sha256 => ring::digest::digest(&SHA256, input.as_bytes()),
        HashAlgorithm::Sha384 => ring::digest::digest(&SHA384, input.as_bytes()),
        HashAlgorithm::Sha512 => ring::digest::digest(&SHA512, input.as_bytes()),
    };
    hex::encode(digest.as_ref())
}

/// Hash multiple inputs in parallel using Rayon
#[napi]
pub fn hash_batch(inputs: Vec<String>, algorithm: HashAlgorithm) -> Vec<String> {
    use rayon::prelude::*;

    inputs
        .into_par_iter()
        .map(|input| hash(input, algorithm))
        .collect()
}

/// Base64 encode
#[napi]
pub fn base64_encode(input: String) -> String {
    general_purpose::STANDARD.encode(input.as_bytes())
}

/// Base64 decode
#[napi]
pub fn base64_decode(input: String) -> Result<String> {
    let bytes = general_purpose::STANDARD
        .decode(input.as_bytes())
        .map_err(|e| {
            Error::new(
                Status::GenericFailure,
                format!("Base64 decode error: {}", e),
            )
        })?;

    String::from_utf8(bytes)
        .map_err(|e| Error::new(Status::GenericFailure, format!("UTF-8 decode error: {}", e)))
}

/// HMAC-SHA256
#[napi]
pub fn hmac_sha256(key: String, message: String) -> String {
    use ring::hmac;

    let key = hmac::Key::new(hmac::HMAC_SHA256, key.as_bytes());
    let tag = hmac::sign(&key, message.as_bytes());
    hex::encode(tag.as_ref())
}
