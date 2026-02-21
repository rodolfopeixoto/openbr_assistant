//! JSON processing module
//!
//! High-performance JSON parsing and manipulation

use napi::bindgen_prelude::*;
use serde_json::Value;

/// Parse JSON string to Value
#[napi]
pub fn json_parse(input: String) -> Result<String> {
    let value: Value = serde_json::from_str(&input)
        .map_err(|e| Error::new(Status::GenericFailure, format!("JSON parse error: {}", e)))?;

    Ok(value.to_string())
}

/// Stringify Value to JSON string
#[napi]
pub fn json_stringify(value: String) -> Result<String> {
    let parsed: Value = serde_json::from_str(&value)
        .map_err(|e| Error::new(Status::GenericFailure, format!("JSON parse error: {}", e)))?;

    serde_json::to_string(&parsed).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("JSON stringify error: {}", e),
        )
    })
}

/// Parse JSON string to pretty-printed JSON
#[napi]
pub fn json_prettify(input: String) -> Result<String> {
    let value: Value = serde_json::from_str(&input)
        .map_err(|e| Error::new(Status::GenericFailure, format!("JSON parse error: {}", e)))?;

    serde_json::to_string_pretty(&value).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("JSON prettify error: {}", e),
        )
    })
}

/// Get value at path (dot notation)
#[napi]
pub fn json_get(input: String, path: String) -> Result<String> {
    let value: Value = serde_json::from_str(&input)
        .map_err(|e| Error::new(Status::GenericFailure, format!("JSON parse error: {}", e)))?;

    let mut current = &value;
    for key in path.split('.') {
        match current {
            Value::Object(map) => {
                current = map.get(key).ok_or_else(|| {
                    Error::new(Status::GenericFailure, format!("Path not found: {}", key))
                })?;
            }
            Value::Array(arr) => {
                let index: usize = key.parse().map_err(|_| {
                    Error::new(
                        Status::GenericFailure,
                        format!("Invalid array index: {}", key),
                    )
                })?;
                current = arr.get(index).ok_or_else(|| {
                    Error::new(
                        Status::GenericFailure,
                        format!("Array index out of bounds: {}", index),
                    )
                })?;
            }
            _ => {
                return Err(Error::new(
                    Status::GenericFailure,
                    "Cannot traverse non-object/array value",
                ))
            }
        }
    }

    Ok(current.to_string())
}

/// Validate JSON string
#[napi]
pub fn json_validate(input: String) -> bool {
    serde_json::from_str::<Value>(&input).is_ok()
}

/// JSON Schema validation placeholder
#[napi]
pub fn json_validate_schema(_input: String, _schema: String) -> Result<bool> {
    // TODO: Implement JSON Schema validation
    Ok(true)
}
