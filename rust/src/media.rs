use napi::bindgen_prelude::*;
use napi_derive::napi;

/// Get image dimensions without loading full image
#[napi]
pub fn get_image_dimensions(data: Buffer) -> Result<ImageDimensions> {
    use image::ImageFormat;

    let format = image::guess_format(&data)
        .map_err(|e| Error::from_reason(format!("Unknown image format: {}", e)))?;

    let (width, height) = image::image_dimensions_from_format(&data, format)
        .map_err(|e| Error::from_reason(format!("Failed to read dimensions: {}", e)))?;

    Ok(ImageDimensions { width, height })
}

#[napi(object)]
pub struct ImageDimensions {
    pub width: u32,
    pub height: u32,
}

/// Resize image
#[napi]
pub fn resize_image(data: Buffer, width: u32, height: u32) -> Result<Buffer> {
    use image::imageops::FilterType;

    let img = image::load_from_memory(&data)
        .map_err(|e| Error::from_reason(format!("Failed to load image: {}", e)))?;

    let resized = img.resize(width, height, FilterType::Lanczos3);

    let mut buf = Vec::new();
    resized
        .write_to(
            &mut std::io::Cursor::new(&mut buf),
            image::ImageOutputFormat::Jpeg(85),
        )
        .map_err(|e| Error::from_reason(format!("Failed to encode image: {}", e)))?;

    Ok(Buffer::from(buf))
}

/// Extract text from PDF
#[napi]
pub fn extract_pdf_text(data: Buffer) -> Result<String> {
    use pdf_extract::extract_text_from_mem;

    extract_text_from_mem(&data)
        .map_err(|e| Error::from_reason(format!("PDF extraction error: {}", e)))
}
