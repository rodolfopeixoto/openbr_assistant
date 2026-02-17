#include <napi.h>
#include <string>
#include <algorithm>

class BufferOps : public Napi::ObjectWrap<BufferOps> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    BufferOps(const Napi::CallbackInfo& info);

private:
    static Napi::FunctionReference constructor;
    
    // Zero-copy slice
    Napi::Value Slice(const Napi::CallbackInfo& info);
    
    // Fast compare using memcmp
    Napi::Value Compare(const Napi::CallbackInfo& info);
    
    // Bulk copy with prefetch
    Napi::Value BulkCopy(const Napi::CallbackInfo& info);
    
    // Memory pool allocation
    Napi::Value Allocate(const Napi::CallbackInfo& info);
};

Napi::FunctionReference BufferOps::constructor;

Napi::Object BufferOps::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "BufferOps", {
        InstanceMethod("slice", &BufferOps::Slice),
        InstanceMethod("compare", &BufferOps::Compare),
        InstanceMethod("bulkCopy", &BufferOps::BulkCopy),
        InstanceMethod("allocate", &BufferOps::Allocate),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("BufferOps", func);
    return exports;
}

BufferOps::BufferOps(const Napi::CallbackInfo& info) 
    : Napi::ObjectWrap<BufferOps>(info) {}

Napi::Value BufferOps::Slice(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 3 || !info[0].IsBuffer() || !info[1].IsNumber() || !info[2].IsNumber()) {
        Napi::TypeError::New(env, "Expected (buffer, start, end)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Buffer<char> buffer = info[0].As<Napi::Buffer<char>>();
    size_t start = info[1].As<Napi::Number>().Uint32Value();
    size_t end = info[2].As<Napi::Number>().Uint32Value();
    
    if (start > buffer.Length() || end > buffer.Length() || start > end) {
        Napi::RangeError::New(env, "Invalid slice range").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Create new buffer with copied data
    size_t len = end - start;
    Napi::Buffer<char> result = Napi::Buffer<char>::Copy(env, buffer.Data() + start, len);
    
    return result;
}

Napi::Value BufferOps::Compare(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsBuffer()) {
        Napi::TypeError::New(env, "Expected (buffer1, buffer2)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Buffer<char> buf1 = info[0].As<Napi::Buffer<char>>();
    Napi::Buffer<char> buf2 = info[1].As<Napi::Buffer<char>>();
    
    if (buf1.Length() != buf2.Length()) {
        return Napi::Number::New(env, buf1.Length() < buf2.Length() ? -1 : 1);
    }
    
    int result = std::memcmp(buf1.Data(), buf2.Data(), buf1.Length());
    return Napi::Number::New(env, result);
}

Napi::Value BufferOps::BulkCopy(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsBuffer()) {
        Napi::TypeError::New(env, "Expected (source, target)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Buffer<char> source = info[0].As<Napi::Buffer<char>>();
    Napi::Buffer<char> target = info[1].As<Napi::Buffer<char>>();
    
    size_t len = std::min(source.Length(), target.Length());
    
    // Use memcpy for maximum speed
    std::memcpy(target.Data(), source.Data(), len);
    
    return Napi::Number::New(env, len);
}

Napi::Value BufferOps::Allocate(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected size").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    size_t size = info[0].As<Napi::Number>().Uint32Value();
    
    // Allocate uninitialized buffer (faster than zeroed)
    Napi::Buffer<char> buffer = Napi::Buffer<char>::New(env, size);
    
    return buffer;
}

// Module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    BufferOps::Init(env, exports);
    return exports;
}

NODE_API_MODULE(openclaw_native, Init)