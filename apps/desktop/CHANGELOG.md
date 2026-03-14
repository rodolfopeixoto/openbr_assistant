# Changelog

All notable changes to the OpenBR Desktop application.

## [2026.1.30] - Initial Release

### Added
- **M1: Foundation** - Basic Tauri structure with core commands
  - `get_app_version` - Get application version
  - `get_gateway_status` - Check gateway connectivity
  - `set_gateway_url` / `get_gateway_url` - Gateway configuration
  - `show_window` / `hide_window` - Window visibility control
  - `quit_app` - Exit application
  - Window configuration: 1200x800, resizable
  - DevTools in debug builds

- **M2: System Tray** - System tray/menu bar integration
  - Tray icon and menu (Show, Hide, Settings, Quit)
  - Left-click toggles window visibility
  - Settings menu emits `open-settings` event

- **M3: Window Management** - Enhanced window functionality
  - Global shortcut: Cmd+Shift+O (macOS) / Ctrl+Shift+O (Windows/Linux)
  - Window state persistence (position, size, maximized state)
  - Auto-save on resize/move
  - Restore position/size on startup
  - `save_window_bounds` command

- **M4: Gateway Integration** - Health monitoring
  - Background health check every 30 seconds
  - Cached health status with `get_gateway_health` command
  - Latency measurement
  - Tray tooltip shows connection status
  - `gateway-health-update` events

- **M5: Auto-Updater** - Update mechanism
  - `check_for_updates` command - Check GitHub releases
  - `install_update` command - Download and install
  - `update-status` and `update-info` events
  - Platform-specific download URL detection
  - Opens download URL in browser

- **M6: Distribution** - Build and deployment
  - Comprehensive NPM scripts for all platforms
  - GitHub Actions workflow for CI/CD
  - Linux: Binary + .deb package
  - Windows: .exe binary
  - macOS: ARM64 and x86_64 binaries
  - Build documentation and troubleshooting guide

### Technical Details
- **Framework**: Tauri v1.5 with Rust backend
- **Bundle Size**: ~5MB (vs ~100MB Electron)
- **Dependencies**: 
  - reqwest for HTTP requests
  - tokio for async runtime
  - chrono for timestamps
  - open for URL handling
- **Features**: shell-open, system-tray, window-all, global-shortcut-all, process-exit

### Security
- Memory-safe Rust implementation
- CSP configured for localhost gateway
- Small attack surface with minimal dependencies

## Future Improvements

### Planned
- [ ] Installer signing for macOS (notarization)
- [ ] Windows code signing
- [ ] Linux Flatpak support
- [ ] Automatic silent updates
- [ ] Plugin system for extensions
- [ ] Theme support (light/dark)
- [ ] Multiple window support

### Under Consideration
- [ ] WebRTC support for video calls
- [ ] Native notifications integration
- [ ] File system access APIs
- [ ] Print functionality
- [ ] Accessibility improvements

## Version History

| Version | Date | Milestones | Notes |
|---------|------|------------|-------|
| 2026.1.30 | 2026-03-08 | M1-M6 | Initial release with all 6 milestones |

---

**Release Process:**
1. Update version in `Cargo.toml` and `package.json`
2. Update this CHANGELOG
3. Create Git tag: `git tag v2026.1.30`
4. Push tag: `git push origin v2026.1.30`
5. GitHub Actions builds and uploads artifacts
6. Create GitHub Release with artifacts
