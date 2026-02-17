{
  "targets": [
    {
      "target_name": "openclaw_native",
      "sources": [
        "main.cc",
        "buffer-ops.cc",
        "simd-ops.cc"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "conditions": [
        ["OS=='mac'", {
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.15",
            "OTHER_CFLAGS": [
              "-O3",
              "-march=native",
              "-ffast-math"
            ]
          }
        }],
        ["OS=='linux'", {
          "cflags": [
            "-O3",
            "-march=native",
            "-ffast-math"
          ],
          "ldflags": [
            "-Wl,--no-as-needed"
          ]
        }]
      ]
    }
  ]
}