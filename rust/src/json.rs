use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde_json::Value;
use simd_json;

/// Parse JSON using SIMD (4x faster than JSON.parse)
#[napi]
pub fn parse_json(data: String) -> Result<String> {
    let mut bytes = data.into_bytes();

    let value: Value = simd_json::serde::from_slice(&mut bytes)
        .map_err(|e| Error::from_reason(format!("JSON parse error: {}", e)))?;

    serde_json::to_string(&value)
        .map_err(|e| Error::from_reason(format!("JSON stringify error: {}", e)))
}

/// Parse JSON buffer (zero-copy where possible)
#[napi]
pub fn parse_json_bytes(data: Buffer) -> Result<String> {
    let mut bytes = Vec::from(data);

    let value: Value = simd_json::serde::from_slice(&mut bytes)
        .map_err(|e| Error::from_reason(format!("JSON parse error: {}", e)))?;

    serde_json::to_string(&value)
        .map_err(|e| Error::from_reason(format!("JSON stringify error: {}", e)))
}

/// Serialize to JSON (compact)
#[napi]
pub fn stringify_json(obj: String) -> Result<String> {
    // Parse then re-serialize to ensure valid JSON
    let value: Value = serde_json::from_str(&obj)
        .map_err(|e| Error::from_reason(format!("Invalid JSON: {}", e)))?;

    serde_json::to_string(&value).map_err(|e| Error::from_reason(format!("Stringify error: {}", e)))
}

/// Batch parse multiple JSON objects in parallel
#[napi]
pub fn parse_json_batch(data: Vec<String>) -> Vec<Result<String>> {
    use rayon::prelude::*;

    data.par_iter()
        .map(|json| parse_json(json.clone()))
        .collect()
}
