use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct Cache {
    inner: Arc<Mutex<HashMap<String, CacheEntry>>>,
}

struct CacheEntry {
    expires_at: Instant,
    value: Value,
}

impl Cache {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn get(&self, key: &str) -> Option<Value> {
        let guard = self.inner.lock().unwrap();
        let entry = guard.get(key)?;
        if entry.expires_at <= Instant::now() {
            return None;
        }
        Some(entry.value.clone())
    }

    pub fn set(&self, key: &str, value: Value, ttl_secs: u64) {
        let mut guard = self.inner.lock().unwrap();
        guard.insert(
            key.to_string(),
            CacheEntry {
                expires_at: Instant::now() + Duration::from_secs(ttl_secs),
                value,
            },
        );
    }

    pub fn invalidate(&self, key: &str) {
        let mut guard = self.inner.lock().unwrap();
        guard.remove(key);
    }
}
