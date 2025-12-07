# Building LocalStream Executables

This guide explains how to build standalone executables for LocalStream that don't require Node.js installation.

## Prerequisites

- Node.js 18+ installed (only for building, not for running the executables)
- npm installed

## Installation

First, install dependencies including pkg:

```bash
npm install
```

## Building Executables

### Build for All Platforms

To build executables for all platforms at once:

```bash
npm run build:all
```

This will create:
- `dist/LocalStream-mac` - macOS Intel (x64)
- `dist/LocalStream-mac-arm64` - macOS Apple Silicon (ARM64)
- `dist/LocalStream-win.exe` - Windows 64-bit
- `dist/LocalStream-linux` - Linux 64-bit

### Build for Specific Platforms

**macOS (Intel):**
```bash
npm run build:mac
```

**macOS (Apple Silicon):**
```bash
npm run build:mac-arm
```

**Windows:**
```bash
npm run build:windows
```

**Linux:**
```bash
npm run build:linux
```

## Running the Executables

### macOS

1. Open Terminal
2. Navigate to the dist folder
3. Make the executable runnable:
   ```bash
   chmod +x LocalStream-mac
   # or for ARM
   chmod +x LocalStream-mac-arm64
   ```
4. Run it:
   ```bash
   ./LocalStream-mac
   # or for ARM
   ./LocalStream-mac-arm64
   ```

### Windows

1. Double-click `LocalStream-win.exe`
2. Or run from Command Prompt:
   ```cmd
   LocalStream-win.exe
   ```

### Linux

1. Open Terminal
2. Make the executable runnable:
   ```bash
   chmod +x LocalStream-linux
   ```
3. Run it:
   ```bash
   ./LocalStream-linux
   ```

## What Gets Bundled

The executable includes:
- Node.js runtime
- All npm dependencies
- Server code (`server.js`)
- All public files (HTML, CSS, JS)
- Configuration file (`config.json`)
- SSL certificates (if present)

## Distribution

You can distribute the executables to users who don't have Node.js installed. They can simply:

1. Download the appropriate executable for their platform
2. Run it
3. Access LocalStream at `http://localhost:3000` or `https://localhost:3443`

## File Size

Executables are compressed with GZip and typically range from:
- macOS: ~50-60 MB
- Windows: ~50-60 MB
- Linux: ~50-60 MB

## Generating SSL Certificates

If you want to include SSL certificates in the build:

```bash
npm run generate-cert
```

Then rebuild the executables. The certificates will be bundled automatically.

## Troubleshooting

### "Permission Denied" on macOS/Linux

Run:
```bash
chmod +x LocalStream-*
```

### Windows SmartScreen Warning

Windows may show a warning for unsigned executables. Users can click "More info" → "Run anyway".

To avoid this in production, you would need to code-sign the executable.

### Port Already in Use

If ports 3000 or 3443 are already in use, edit `config.json` before building or after extracting.

## Advanced Configuration

### Custom Build Targets

You can specify custom targets in `package.json`:

```json
"build:custom": "pkg . --targets node18-linux-arm64 --output dist/LocalStream-linux-arm64"
```

Available targets:
- `node18-macos-x64`
- `node18-macos-arm64`
- `node18-win-x64`
- `node18-linux-x64`
- `node18-linux-arm64`

### Compression

All builds use GZip compression by default. To disable:

```bash
pkg . --targets node18-macos-x64 --output dist/LocalStream-mac
```

## Notes

- Executables are platform-specific and cannot be cross-run
- The first run may be slower as pkg extracts files
- Updates require rebuilding and redistributing the executable
- Configuration changes require rebuilding or manual config.json editing

## Support

For issues with building or running executables, check:
1. Node.js version (must be 18+)
2. pkg version (`npm list pkg`)
3. Platform compatibility
4. File permissions

---

**Version:** 1.0  
**Last Updated:** 2025-12-07
