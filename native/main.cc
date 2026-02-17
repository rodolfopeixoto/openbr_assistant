#include <napi.h>

// Forward declarations from other modules
Napi::Object InitBufferOps(Napi::Env env, Napi::Object exports);
Napi::Object InitSimdOps(Napi::Env env, Napi::Object exports);

// Main module initialization
Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    InitBufferOps(env, exports);
    InitSimdOps(env, exports);
    return exports;
}

NODE_API_MODULE(openclaw_native, InitAll)
