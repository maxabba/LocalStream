# LocalStream

High-quality, low-latency local network streaming from mobile devices to OBS Studio.

## Features

- 📱 **Mobile Camera Streaming** - Use any iOS/Android device as a camera source
- 🎥 **OBS Integration** - Direct integration with OBS Studio via Browser Source
- ⚡ **Ultra-Low Latency** - <100ms latency on local network
- 🎨 **Advanced Camera Controls** - Brightness, contrast, saturation, white balance
- ⛶ **Fullscreen Preview** - Professional monitoring mode with overlay controls
- 📊 **Real-time Statistics** - Monitor FPS, bitrate, resolution, and latency
- 🌐 **Cross-Platform** - Works on macOS, Windows, and Linux
- 🔒 **HTTPS Support** - Secure connections for iOS camera access
- 📲 **QR Code Setup** - Easy mobile device connection

## Quick Start

### Option 1: Run from Source (Requires Node.js)

```bash
# Install dependencies
npm install

# Generate SSL certificates (for iOS)
npm run generate-cert

# Start server
npm start
```

### Option 2: Standalone Executable (No Node.js Required)

Download the appropriate zip file for your platform from the [releases page](https://github.com/maxabba/LocalStream/releases):

- **macOS Intel**: `LocalStream-macos-intel.zip`
- **macOS Apple Silicon**: `LocalStream-macos-silicon.zip`
- **Windows**: `LocalStream-windows.zip`
- **Linux**: `LocalStream-linux.zip`

Then simply unzip and run!

## Usage

1. **Start the Server**
   - Run `npm start` or the executable
   - Server starts on `http://localhost:3000` and `https://localhost:3443`

2. **Connect Mobile Device**
   - Open `https://YOUR_IP:3443/mobile` on your phone
   - Accept the security warning (self-signed certificate)
   - Allow camera and microphone access
   - Configure quality and camera
   - Click "Start Streaming"
   - **Tip:** Use the fullscreen icon for a better monitoring experience and access advanced controls!

3. **Add to OBS**
   - In OBS, add a Browser Source
   - Copy the viewer URL from mobile or desktop dashboard
   - Paste into OBS Browser Source URL
   - Set size to 1920x1080 @ 60fps
   - Done!

## Building from Source

See [BUILD.md](docs/BUILD.md) for detailed instructions on creating standalone executables.

```bash
# Build for all platforms (automatically creates zips)
npm run build:all

# Or build for specific platform
npm run build:mac
npm run build:windows
npm run build:linux
```

## Documentation

- [iOS Setup Guide](docs/iOS_SETUP.md) - How to use with iOS devices
- [OBS Setup Guide](docs/OBS_SETUP.md) - OBS integration instructions
- [Build Guide](docs/BUILD.md) - Creating standalone executables

## System Requirements

### Server
- **Node.js**: 18+ (if running from source)
- **Ports**: 3000 (HTTP) and 3443 (HTTPS)
- **Network**: Local network access

### Mobile Device
- **iOS**: Safari 14+ (requires HTTPS)
- **Android**: Chrome 90+
- **Camera**: Any device with camera access

### OBS Studio
- **Version**: 28.0+
- **Browser Source**: Enabled

## Configuration

Edit `config.json` to customize:

```json
{
  "server": {
    "port": 3000,
    "httpsPort": 3443,
    "host": "0.0.0.0"
  },
  "webrtc": {
    "iceServers": [...]
  }
}
```

## Architecture

```
Mobile Device (Camera)
    ↓ WebRTC
Server (Node.js + Socket.IO)
    ↓ WebRTC
OBS Studio (Browser Source)
```

## Technology Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Streaming**: WebRTC (peer-to-peer)
- **Discovery**: mDNS/Bonjour
- **Build**: pkg (standalone executables)

## Performance

- **Latency**: <100ms on local network
- **Quality**: Up to 4K 60fps
- **Bitrate**: Adaptive 1-20 Mbps
- **CPU**: Low (hardware encoding when available)

## Troubleshooting

### iOS Camera Not Working
- Make sure you're using HTTPS (`https://...`)
- Accept the self-signed certificate warning
- See [iOS_SETUP.md](docs/iOS_SETUP.md)

### OBS Shows Black Screen
- Use HTTP URL instead of HTTPS
- Check that stream is active on mobile
- Try disabling hardware acceleration in OBS

### High Latency
- Ensure devices are on the same local network
- Check WiFi signal strength
- Reduce quality preset if needed

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions:
- Check the [documentation](docs/)
- Open an issue on GitHub
- Check existing issues for solutions

---

**Version**: 1.0.3  
**Author**: LocalStream Team  
**Last Updated**: 2025-12-07
