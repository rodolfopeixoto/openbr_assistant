fn main() {
    // Tell cargo to link against the Node.js N-API
    // On macOS, we don't need to link explicitly as N-API is loaded at runtime
    // but we need to allow undefined symbols
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rustc-link-arg=-undefined");
        println!("cargo:rustc-link-arg=dynamic_lookup");
        println!("cargo:rustc-link-arg=-Wl,-no_fixup_chains");
    }

    // On Linux, similar approach
    #[cfg(target_os = "linux")]
    {
        println!("cargo:rustc-link-arg=-Wl,--allow-shlib-undefined");
    }
}
