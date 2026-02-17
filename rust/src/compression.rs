use napi::bindgen_prelude::*;
use napi_derive::napi;

/// Compress data using Zstd
#[napi]
pub fn zstd_compress(data: Buffer, level: Option<i32>) -> Result<Buffer> {
    let level = level.unwrap_or(3);

    zstd::encode_all(&data[..], level)
        .map(Buffer::from)
        .map_err(|e| Error::from_reason(format!("Compression error: {}", e)))
}

/// Decompress Zstd data
#[napi]
pub fn zstd_decompress(data: Buffer) -> Result<Buffer> {
    zstd::decode_all(&data[..])
        .map(Buffer::from)
        .map_err(|e| Error::from_reason(format!("Decompression error: {}", e)))
}

/// Compress using LZ4 (ultra-fast)
#[napi]
pub fn lz4_compress(data: Buffer) -> Result<Buffer> {
    use lz4::block::compress;

    compress(&data, None, true)
        .map(Buffer::from)
        .map_err(|e| Error::from_reason(format!("LZ4 compression error: {:?}", e)))
}

/// Decompress LZ4 data
#[napi]
pub fn lz4_decompress(data: Buffer, uncompressed_size: u32) -> Result<Buffer> {
    use lz4::block::decompress;

    decompress(&data, Some(uncompressed_size as i32))
        .map(Buffer::from)
        .map_err(|e| Error::from_reason(format!("LZ4 decompression error: {:?}", e)))
}
