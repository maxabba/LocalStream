# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2025-12-07
### Fixed
- Fixed MacOS binaries crash (`zsh: killed`) on Apple Silicon by switching build runner to macOS and applying ad-hoc code signing required for ARM64 execution.

## [1.0.3] - 2025-12-07
### Changed
- Release artifacts are now compressed in `.zip` format for consistency and to preserve permissions.
- Updated binaries naming convention in release assets.

## [1.0.2] - 2025-12-07
### Fixed
- Fixed release workflow: Switched to single-job cross-compilation on Ubuntu to resolve Windows runner issues.

## [1.0.1] - 2025-12-07
### Fixed
- Fixed build configuration: Added `bin` property to `package.json` required by `pkg`.

## [1.0.0] - 2025-12-07

### Added
- **WebRTC Streaming**: Low-latency peer-to-peer streaming (<100ms).
- **Mobile App**:
  - Fullscreen preview mode with sophisticated camera controls (Brightness, Contrast, Saturation, White Balance).
  - Quality presets (4K60, 1080p60, etc.).
  - Front/Back camera switching.
- **Desktop Dashboard**:
  - Real-time stream monitoring.
  - QR Code generation for easy mobile connection.
- **OBS Integration**:
  - HTTP stream endpoints for compatibility with OBS Browser Source.
  - Auto-play and auto-reconnect logic.
- **Server**:
  - Dual HTTP (3000) and HTTPS (3443) support for maximum compatibility (iOS requires HTTPS, OBS prefers HTTP).
  - Multicast DNS (mDNS) support for local network discovery.
- **Build System**:
  - `pkg` integration for creating standalone executables (Mac, Windows, Linux).
  - GitHub Actions workflow for automated releases.

### Fixed
- WebRTC signaling flow (Viewer now initiates offer).
- Socket.IO connection issues on different protocols.
- "Start Streaming" button state after stopping stream.
- Layout issues on mobile interface.

### Security
- Self-signed certificate generation for local HTTPS.
