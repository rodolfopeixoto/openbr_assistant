use lru::LruCache;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// LRU Cache with TTL support
#[napi]
pub struct TimedCache {
    inner: Mutex<LruCache<String, CacheEntry>>,
    ttl: Duration,
}

struct CacheEntry {
    value: String,
    inserted_at: Instant,
}

#[napi]
impl TimedCache {
    #[napi(constructor)]
    pub fn new(capacity: u32, ttl_seconds: u32) -> Self {
        let cap = NonZeroUsize::new(capacity as usize).unwrap_or(NonZeroUsize::new(100).unwrap());
        Self {
            inner: Mutex::new(LruCache::new(cap)),
            ttl: Duration::from_secs(ttl_seconds as u64),
        }
    }

    #[napi]
    pub fn get(&self, key: String) -> Option<String> {
        let mut cache = self.inner.lock().unwrap();

        if let Some(entry) = cache.get(&key) {
            if entry.inserted_at.elapsed() < self.ttl {
                return Some(entry.value.clone());
            }
            // Entry expired, remove it
            cache.pop(&key);
        }
        None
    }

    #[napi]
    pub fn set(&self, key: String, value: String) {
        let mut cache = self.inner.lock().unwrap();
        cache.put(
            key,
            CacheEntry {
                value,
                inserted_at: Instant::now(),
            },
        );
    }

    #[napi]
    pub fn len(&self) -> u32 {
        let cache = self.inner.lock().unwrap();
        cache.len() as u32
    }

    #[napi]
    pub fn clear(&self) {
        let mut cache = self.inner.lock().unwrap();
        cache.clear();
    }
}

/// Simple HashMap wrapper for group histories
#[napi]
pub struct GroupHistoryCache {
    inner: Mutex<HashMap<String, Vec<HistoryEntry>>>,
    max_entries_per_group: usize,
}

#[napi(object)]
#[derive(Clone)]
pub struct HistoryEntry {
    pub timestamp: u32,
    pub content: String,
}

#[napi]
impl GroupHistoryCache {
    #[napi(constructor)]
    pub fn new(max_entries: u32) -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
            max_entries_per_group: max_entries as usize,
        }
    }

    #[napi]
    pub fn add(&self, group_id: String, entry: HistoryEntry) {
        let mut cache = self.inner.lock().unwrap();
        let history = cache.entry(group_id).or_insert_with(Vec::new);

        history.push(entry);

        // Keep only last N entries
        if history.len() > self.max_entries_per_group {
            history.remove(0);
        }
    }

    #[napi]
    pub fn get(&self, group_id: String) -> Vec<HistoryEntry> {
        let cache = self.inner.lock().unwrap();
        cache.get(&group_id).cloned().unwrap_or_default()
    }

    #[napi]
    pub fn clear_group(&self, group_id: String) {
        let mut cache = self.inner.lock().unwrap();
        cache.remove(&group_id);
    }
}
