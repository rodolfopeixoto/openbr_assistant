# OpenBR Desktop

Cross-platform desktop application for OpenBR - Your AI Assistant. Built with Tauri (Rust) for Linux, Windows, and macOS.

## Features

- 🖥️ **Cross-Platform**: Native apps for Linux, Windows, and macOS
- 🔔 **System Tray**: Quick access from system tray/menu bar
- ⌨️ **Global Shortcuts**: Toggle window with Cmd/Ctrl+Shift+O
- 💾 **Window Persistence**: Remembers position and size
- 🌐 **Gateway Health**: Real-time monitoring with status indicators
- 🔄 **Auto-Updater**: Built-in update checking from GitHub releases
- 🔒 **Security**: Small bundle size (~5MB), memory-safe Rust backend

## Requirements

- **Rust**: 1.70 or later
- **Node.js**: 18+ (for development scripts)
- **OpenBR Gateway**: Running at `http://localhost:18789`

## Project Structure

```
apps/desktop/
├── src-tauri/
│   ├── src/main.rs        # Main Rust application
│   ├── Cargo.toml         # Rust dependencies
│   ├── tauri.conf.json    # Tauri configuration
│   └── icons/             # App icons
├── package.json           # NPM scripts
└── README.md
```

## Quick Start

```bash
# Install Rust dependencies
cd apps/desktop/src-tauri
cargo build

# Run in development mode
cargo tauri dev

# The app will open and connect to http://localhost:18789
```

## Development Commands

```bash
# From apps/desktop directory:

# Development
npm run dev                 # Start development server
npm run dev:debug          # Start with devtools

# Building
npm run build              # Build for current platform
npm run build:debug        # Debug build
npm run build:linux        # Build for Linux
npm run build:windows      # Build for Windows
npm run build:mac          # Build for macOS (x86_64)
npm run build:mac:arm      # Build for macOS (ARM64)
npm run build:universal    # Universal macOS build

# Quality
npm run check              # Check compilation
npm run check:all          # Check all targets
npm run test               # Run tests
npm run test:all           # Run all tests
npm run lint               # Run clippy linter
npm run fmt                # Format code
npm run fmt:check          # Check formatting

# Cleaning
npm run clean              # Clean build artifacts
```

## Distribution

### GitHub Actions

The `.github/workflows/desktop-build.yml` workflow automatically builds for all platforms on:
- Push to `develop` or `main` branches (when desktop files change)
- Tag pushes (e.g., `v2026.1.30`)
- Pull requests to `develop` or `main`

Build artifacts are uploaded for each platform:
- Linux: Binary + .deb package
- Windows: .exe binary
- macOS: ARM64 and x86_64 binaries

### Manual Distribution

#### Linux (.deb package)

```bash
cd apps/desktop/src-tauri

# Install cargo-deb
cargo install cargo-deb

# Build release binary
cargo build --release

# Create .deb package
cargo deb --no-build

# Package will be at: target/debian/openbr-desktop_*.deb
```

#### Windows (.msi installer)

```bash
cd apps/desktop/src-tauri

# Build release with WiX (requires WiX Toolset)
cargo tauri build

# Or use Tauri CLI
cargo install tauri-cli
cargo tauri build

# Installer will be at: target/release/bundle/msi/*.msi
```

#### macOS (.dmg or .app)

```bash
cd apps/desktop/src-tauri

# Build for current architecture
cargo tauri build

# Or specific targets:
cargo tauri build --target aarch64-apple-darwin   # ARM64 (M1/M2)
cargo tauri build --target x86_64-apple-darwin    # Intel
cargo tauri build --target universal-apple-darwin # Universal

# App will be at: target/release/bundle/macos/OpenBR.app
```

## Available Commands

Tauri commands exposed to the frontend:

### Core
- `get_app_version()` → `String` - Get current app version
- `quit_app()` - Exit application

### Window Management
- `show_window()` - Show and focus window
- `hide_window()` - Hide window
- `save_window_bounds()` - Save current window position/size

### Gateway
- `get_gateway_status()` → `GatewayStatus` - Check gateway connectivity
- `get_gateway_health()` → `GatewayHealth` - Get cached health status
- `set_gateway_url(url: String)` - Configure gateway URL
- `get_gateway_url()` → `String` - Get current gateway URL

### Updates
- `check_for_updates()` → `UpdateInfo` - Check for new releases
- `install_update(download_url: String)` - Download and install update

## Events

Frontend can listen to these events:

- `gateway-health-update` - Emitted every 30s with health status
- `open-settings` - Emitted when user clicks Settings in tray menu
- `update-status` - Emitted during update process
- `update-info` - Emitted with update check results

## Milestones

All milestones completed! ✅

- **M1: Foundation** ✅ Basic Tauri structure with 7 working commands
- **M2: System Tray** ✅ Tray menu with Show/Hide/Settings/Quit
- **M3: Window Management** ✅ Global shortcut, persistence, restoration
- **M4: Gateway Integration** ✅ Health monitoring, status indicators
- **M5: Auto-Updater** ✅ Update checking, download integration
- **M6: Distribution** ✅ CI/CD, build scripts, packaging

## Configuration

### tauri.conf.json

Key settings:
- **Window**: 1200x800 default, resizable
- **System Tray**: Enabled with icon
- **CSP**: Configured for localhost gateway
- **Bundle Targets**: deb, rpm, msi, dmg

### Environment Variables

- `OPENBR_GATEWAY_URL` - Override default gateway URL
- `RUST_LOG` - Control logging level (e.g., `info`, `debug`)

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
cargo clean
cargo build

# Update dependencies
cargo update

# Check Rust version
rustc --version  # Should be >= 1.70
```

### Linux Dependencies

```bash
# Ubuntu/Debian
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev

# Fedora
sudo dnf install gtk3-devel webkit2gtk3-devel libappindicator-gtk3-devel librsvg2-devel

# Arch
sudo pacman -S gtk3 webkit2gtk libappindicator-gtk3 librsvg
```

### macOS Signing

For distribution outside the App Store:

```bash
# Set environment variables
export CODESIGN_IDENTITY="Developer ID Application: Your Name"

# Build with signing
cargo tauri build
```

## License

MIT © OpenBR Team

## Contributing

1. Follow the milestone structure for new features
2. Run `cargo fmt` and `cargo clippy` before committing
3. Test on at least one target platform
4. Update this README for new commands or features
