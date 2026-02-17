use blake3::Hasher;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use xxhash_rust::xxh3::xxh3_64;

/// Ultra-fast Blake3 hash
#[napi]
pub fn blake3_hash(data: Buffer) -> Buffer {
    let hash = blake3::hash(&data);
    Buffer::from(hash.as_bytes().to_vec())
}

/// XXH3 hash (faster for non-cryptographic use)
#[napi]
pub fn xxh3_hash(data: Buffer) -> u64 {
    xxh3_64(&data)
}

/// Hash multiple items in parallel
#[napi]
pub fn hash_batch(data: Vec<Buffer>) -> Vec<Buffer> {
    // Convert to Vec<u8> first for parallel processing
    let byte_data: Vec<Vec<u8>> = data.into_iter().map(|b| b.to_vec()).collect();

    use rayon::prelude::*;
    byte_data
        .par_iter()
        .map(|buf| {
            let hash = blake3::hash(buf);
            Buffer::from(hash.as_bytes().to_vec())
        })
        .collect()
}

/// Streaming hasher (for large files)
#[napi]
pub struct Blake3Hasher {
    inner: Hasher,
}

#[napi]
impl Blake3Hasher {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Hasher::new(),
        }
    }

    #[napi]
    pub fn update(&mut self, data: Buffer) {
        self.inner.update(&data);
    }

    #[napi]
    pub fn finalize(&self) -> Buffer {
        let hash = self.inner.finalize();
        Buffer::from(hash.as_bytes().to_vec())
    }
}
