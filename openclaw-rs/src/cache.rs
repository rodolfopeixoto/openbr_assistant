//! High-performance caching module
//!
//! Thread-safe in-memory cache with TTL support

use napi::bindgen_prelude::*;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::time::{Duration, Instant};

struct CacheEntry {
    value: String,
    expires_at: Option<Instant>,
}

#[napi]
pub struct Cache {
    store: RwLock<HashMap<String, CacheEntry>>,
    default_ttl: RwLock<Option<u64>>, // milliseconds
}

#[napi]
impl Cache {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            store: RwLock::new(HashMap::new()),
            default_ttl: RwLock::new(None),
        }
    }

    /// Set default TTL in milliseconds
    #[napi]
    pub fn set_default_ttl(&self, ttl_ms: Option<u64>) {
        *self.default_ttl.write() = ttl_ms;
    }

    /// Store value with optional TTL (milliseconds)
    #[napi]
    pub fn set(&self, key: String, value: String, ttl_ms: Option<u64>) {
        let expires_at = ttl_ms
            .or(*self.default_ttl.read())
            .map(|ms| Instant::now() + Duration::from_millis(ms));

        self.store
            .write()
            .insert(key, CacheEntry { value, expires_at });
    }

    /// Get value by key
    #[napi]
    pub fn get(&self, key: String) -> Option<String> {
        let store = self.store.read();

        if let Some(entry) = store.get(&key) {
            // Check if expired
            if let Some(expires_at) = entry.expires_at {
                if Instant::now() > expires_at {
                    drop(store);
                    self.store.write().remove(&key);
                    return None;
                }
            }
            return Some(entry.value.clone());
        }

        None
    }

    /// Delete value by key
    #[napi]
    pub fn delete(&self, key: String) -> bool {
        self.store.write().remove(&key).is_some()
    }

    /// Check if key exists and not expired
    #[napi]
    pub fn has(&self, key: String) -> bool {
        self.get(key).is_some()
    }

    /// Get all keys
    #[napi]
    pub fn keys(&self) -> Vec<String> {
        self.cleanup_expired();
        self.store.read().keys().cloned().collect()
    }

    /// Clear all entries
    #[napi]
    pub fn clear(&self) {
        self.store.write().clear();
    }

    /// Get cache size
    #[napi]
    pub fn size(&self) -> u32 {
        self.store.read().len() as u32
    }

    /// Cleanup expired entries
    #[napi]
    pub fn cleanup_expired(&self) {
        let now = Instant::now();
        let mut store = self.store.write();
        store.retain(|_, entry| {
            entry
                .expires_at
                .map_or(true, |expires_at| now <= expires_at)
        });
    }
}

/// Simple LRU Cache placeholder
#[napi]
pub struct LruCache {
    // TODO: Implement LRU cache
}
