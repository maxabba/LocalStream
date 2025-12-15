# LocalStream - System Architecture

Complete technical architecture documentation for LocalStream.

---

## Overview

LocalStream is a **professional WebRTC-based streaming solution** designed for local network broadcasting. It enables mobile devices to function as camera sources for OBS Studio with ultra-low latency.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     LocalStream System                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Mobile     │      │              │      │    OBS    │ │
│  │  Streamer    │◄────►│    Server    │◄────►│  Viewer   │ │
│  │  (Camera)    │      │ (Node.js +   │      │ (Browser) │ │
│  └──────────────┘      │  Socket.IO)  │      └───────────┘ │
│         │              └──────────────┘             │       │
│         │                     │                     │       │
│         └─────────────────────┼─────────────────────┘       │
│                   WebRTC P2P Connection                      │
│                                                               │
│  ┌──────────────┐                                            │
│  │   Desktop    │                                            │
│  │  Dashboard   │◄────────── HTTP/WebSocket ────────────┐  │
│  │  (Monitor)   │                                        │  │
│  └──────────────┘                                        │  │
│                                                           │  │
│  ┌──────────────┐                                        │  │
│  │   Electron   │                                        │  │
│  │     GUI      │────── Process Management ──────────────┘  │
│  │  (Optional)  │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Server Architecture

### Technology Stack

**Backend:**
- **Node.js** - Runtime environment
- **Express** - HTTP server framework
- **Socket.IO** - WebSocket communication for signaling
- **Bonjour-service** - mDNS/Bonjour service discovery
- **QRCode** - QR code generation for mobile access

**Frontend:**
- **Vanilla JavaScript** - No frameworks for minimal overhead
- **WebRTC API** - Peer-to-peer streaming
- **Socket.IO Client** - Real-time communication

**Desktop:**
- **Electron** - Native desktop application wrapper
- **Child Process** - Server process management

### Server Modes

LocalStream server operates in two modes:

#### 1. HTTPS Mode (iOS Compatible)
```javascript
Port 3443 (HTTPS) - Primary for mobile streaming
Port 3000 (HTTP)  - Fallback and OBS viewer
```
- **Requires**: Self-signed SSL certificates (`localhost-key.pem`, `localhost-cert.pem`)
- **Benefits**: Full iOS/Safari support (required for camera access)
- **Usage**: Generate with `npm run generate-cert`

#### 2. HTTP-Only Mode (Desktop Only)
```javascript
Port 3000 (HTTP) - All traffic
```
- **Limitations**: iOS/Safari will NOT work (no camera access)
- **Usage**: Fallback when certificates are missing

---

## Communication Flow

### 1. Stream Setup Flow

```
Mobile Device                 Server                    OBS Viewer
     │                          │                           │
     │── register-streamer ────►│                           │
     │                          │                           │
     │◄──── registered ─────────│                           │
     │   (streamId, viewerURL)  │                           │
     │                          │                           │
     │                          │◄── register-viewer ───────│
     │                          │   (streamId)              │
     │                          │                           │
     │                          │──── registered ──────────►│
     │                          │   (streamerSocketId)      │
     │                          │                           │
```

### 2. WebRTC Signaling Flow

```
Streamer                      Server                     Viewer
   │                            │                           │
   │──── offer ────────────────►│                           │
   │                            │──── offer ───────────────►│
   │                            │                           │
   │                            │◄──── answer ──────────────│
   │◄──── answer ───────────────│                           │
   │                            │                           │
   │──── ice-candidate ────────►│                           │
   │                            │──── ice-candidate ───────►│
   │                            │                           │
   │◄──── ice-candidate ────────│                           │
   │                            │◄──── ice-candidate ───────│
   │                            │                           │
   └──────────────────── WebRTC P2P Connection ────────────┘
                    (Server is no longer in media path)
```

### 3. Data Flow

**Signaling** (via Socket.IO):
- Connection establishment
- Stream registration
- Offer/Answer exchange
- ICE candidate exchange

**Media** (via WebRTC):
- Direct peer-to-peer video/audio
- Low latency (<100ms)
- Adaptive bitrate
- No server relay (unless TURN needed)

---

## WebRTC Configuration

### ICE Servers
```json
{
  "webrtc": {
    "iceServers": []
  }
}
```
- **Default**: Empty (LAN-only mode)
- **LAN Mode**: NAT traversal handled locally
- **Optional**: Add STUN/TURN servers for internet streaming

### Video Constraints
```json
{
  "video": {
    "defaultConstraints": {
      "width": { "ideal": 1920 },
      "height": { "ideal": 1080 },
      "frameRate": { "ideal": 60 },
      "facingMode": "user"
    }
  }
}
```

### Quality Presets

| Preset | Resolution | FPS | Bitrate | Description |
|--------|-----------|-----|---------|-------------|
| **2k30** | 2560x1440 | 30 | 8 Mbps | 2K 30fps (High quality) |
| **1080p30** | 1920x1080 | 30 | 6 Mbps | Full HD 30fps (Default) |
| **1080p25** | 1920x1080 | 25 | 5 Mbps | Full HD 25fps (PAL) |
| **720p30** | 1280x720 | 30 | 4 Mbps | HD 30fps (Medium) |
| **720p25** | 1280x720 | 25 | 3 Mbps | HD 25fps (Low bandwidth) |

---

## File Structure

```
LocalStream/
├── server.js                 # Main Node.js server
├── config.json              # Server configuration
├── package.json             # Dependencies and scripts
├── localhost-*.pem          # SSL certificates (generated)
│
├── gui/                     # Electron desktop app
│   ├── main.js             # Electron main process
│   ├── preload.js          # IPC bridge
│   ├── renderer.js         # UI logic
│   ├── server-worker.js    # Server child process
│   ├── index.html          # Desktop UI
│   └── icon.*              # App icons
│
├── public/                  # Web client files
│   ├── index.html          # Landing page
│   ├── mobile/             # Mobile streamer app
│   │   ├── index.html      # Streamer UI
│   │   ├── streamer.js     # Camera & streaming logic
│   │   └── style.css       # Mobile styles
│   ├── viewer/             # OBS viewer app
│   │   ├── index.html      # Viewer UI
│   │   ├── viewer.js       # Playback logic
│   │   └── debug.html      # Debug viewer
│   ├── desktop/            # Desktop dashboard
│   │   ├── index.html      # Dashboard UI
│   │   ├── desktop.js      # Stream management
│   │   └── style.css       # Dashboard styles
│   └── shared/             # Shared utilities
│       ├── webrtc-client.js # WebRTC abstraction
│       └── utils.js        # Common utilities
│
└── docs/                    # Documentation (GitHub Pages)
    ├── index.html          # Landing page
    ├── wiki.md             # Wiki home
    ├── *.md                # Documentation files
    └── ...
```

---

## API Endpoints

### REST API

#### Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "streams": 2,
  "uptime": 3600.5
}
```

#### Get Configuration
```http
GET /api/config
```
**Response:**
```json
{
  "webrtc": { "iceServers": [] },
  "video": { "defaultConstraints": {...}, "presets": {...} },
  "serverURL": "https://192.168.1.100:3443"
}
```

#### Get Active Streams
```http
GET /api/streams
```
**Response:**
```json
[
  {
    "id": "stream-1234567890",
    "name": "Camera 1",
    "status": "active",
    "viewers": 1,
    "createdAt": "2025-12-15T10:30:00.000Z",
    "stats": {
      "bitrate": 6000000,
      "fps": 30,
      "resolution": "1920x1080"
    }
  }
]
```

#### Generate QR Code
```http
GET /api/qr/mobile
```
**Response:**
```json
{
  "qr": "data:image/png;base64,...",
  "url": "https://192.168.1.100:3443/mobile"
}
```

### Socket.IO Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `register-streamer` | `{ streamId?, name?, resolution? }` | Register as camera source |
| `register-viewer` | `{ streamId }` | Register as stream viewer |
| `offer` | `{ to, offer, streamId }` | Send WebRTC offer |
| `answer` | `{ to, answer }` | Send WebRTC answer |
| `ice-candidate` | `{ to, candidate }` | Send ICE candidate |
| `stats-update` | `{ role, bitrate?, fps?, ... }` | Update stream statistics |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `registered` | `{ streamId, viewerURL }` (streamer)<br>`{ streamId, streamerSocketId }` (viewer) | Registration confirmation |
| `offer` | `{ from, offer, streamId }` | Forwarded WebRTC offer |
| `answer` | `{ from, answer }` | Forwarded WebRTC answer |
| `ice-candidate` | `{ from, candidate }` | Forwarded ICE candidate |
| `streams-updated` | `Array<Stream>` | Active streams list updated |
| `network-usage` | `{ totalBitrate, streamCount }` | Network statistics |
| `error` | `{ message }` | Error notification |

---

## Network Discovery

### mDNS/Bonjour

LocalStream publishes itself via Bonjour for automatic discovery:

```json
{
  "name": "LocalStream",
  "type": "http",
  "port": 3000,
  "txt": {
    "path": "/",
    "version": "1.0.0"
  }
}
```

**Discovery:** Compatible devices on the same network can automatically find the LocalStream server.

---

## Security

### HTTPS/TLS
- **Self-signed certificates** for local network use
- **iOS requirement**: Camera API requires HTTPS
- **Browser warning**: Users must accept certificate on first visit

### CORS
```javascript
{
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
}
```
- **Permissive**: Allows all origins (safe for local network)

### No Authentication
- **Design**: Local network trust model
- **Future**: Could add optional password protection

---

## Performance Optimizations

### Server Level
- **WebSocket compression disabled**: Lower latency on LAN
- **HTTP compression disabled**: Faster for local network
- **WebSocket transport preferred**: Falls back to polling

### WebRTC Level
- **Direct P2P**: Media never touches server
- **Hardware encoding**: Mobile device GPU acceleration
- **Adaptive bitrate**: Adjusts to network conditions

### Socket.IO Tuning
```javascript
{
  pingTimeout: 60000,
  pingInterval: 25000,
  perMessageDeflate: false,
  httpCompression: false,
  transports: ['websocket', 'polling']
}
```

---

## Electron Integration

### Process Architecture
```
Electron Main Process
  │
  ├── GUI Window (Renderer Process)
  │   └── IPC Bridge (preload.js)
  │
  └── Server Worker (Child Process)
      └── server.js (Node.js HTTP server)
```

### IPC Communication

**Main → Renderer:**
- `server-status`: Status updates
- `server-log`: Log messages

**Renderer → Main:**
- `start-server`: Start server
- `stop-server`: Stop server
- `open-browser`: Open URL in browser

---

## Audio Support

**Current Status:** Audio is **DISABLED by default** in mobile streamer.

**Reason:** Optimizes network bandwidth for multi-device streaming scenarios.

**Enable Audio:**
```javascript
// In public/mobile/streamer.js (lines ~295, 465)
audio: true  // Change from false
```

---

## Browser Compatibility

### Mobile
- **iOS**: Safari 14+ (requires HTTPS)
- **Android**: Chrome 90+, Firefox 90+, Edge 90+

### Desktop
- **Chrome/Edge**: 90+
- **Firefox**: 90+
- **Safari**: 14+
- **OBS Browser Source**: Chromium-based

---

## Deployment Modes

### 1. CLI Mode
```bash
npm start
# or
node server.js
```
Direct Node.js execution for servers/development.

### 2. Electron GUI Mode
```bash
npm run electron
```
Desktop application with visual controls.

### 3. Standalone Executable
```bash
# Pre-built binaries (no Node.js required)
./LocalStream.app  # macOS
LocalStream.exe    # Windows
./LocalStream      # Linux
```

---

## Configuration Reference

### config.json

```json
{
  "server": {
    "port": 3000,           // HTTP port
    "httpsPort": 3443,      // HTTPS port
    "host": "0.0.0.0"       // Bind to all interfaces
  },
  "webrtc": {
    "iceServers": []        // STUN/TURN servers (empty = LAN only)
  },
  "video": {
    "defaultConstraints": { // Default camera settings
      "width": { "ideal": 1920 },
      "height": { "ideal": 1080 },
      "frameRate": { "ideal": 60 },
      "facingMode": "user"  // "user" or "environment"
    },
    "presets": {            // Quality presets (see table above)
      // ... preset definitions
    }
  },
  "discovery": {
    "enabled": true,        // Enable mDNS/Bonjour
    "serviceName": "LocalStream",
    "serviceType": "http"
  }
}
```

---

## Technical Specifications

### Network Requirements
- **Bandwidth**: 3-8 Mbps per stream (depends on quality)
- **Latency**: <100ms on gigabit LAN, <200ms on WiFi
- **Ports**: 3000 (HTTP), 3443 (HTTPS)
- **Protocol**: WebRTC (UDP preferred), WebSocket (TCP fallback)

### System Requirements

**Server:**
- Node.js 18+
- 100 MB RAM per stream
- Minimal CPU (signaling only)

**Mobile:**
- Modern browser with WebRTC support
- Camera access permission
- Stable WiFi connection

**OBS:**
- OBS Studio 28.0+
- Browser Source enabled

---

## Troubleshooting

### Common Issues

**iOS Camera Not Working:**
- ✅ Ensure using HTTPS URL
- ✅ Accept security certificate
- ✅ Grant camera permission

**High Latency:**
- ✅ Check WiFi signal strength
- ✅ Reduce stream quality
- ✅ Close other network applications

**Black Screen in OBS:**
- ✅ Use HTTP viewer URL (not HTTPS)
- ✅ Verify stream is active
- ✅ Disable hardware acceleration in OBS

---

## Version Information

**Current Version:** 1.0.12
**Release Date:** December 2025
**Minimum Node.js:** 18.0.0

---

**See Also:**
- [Setup Guides](../wiki/)
- [OBS Integration](../OBS_SETUP)
- [iOS Setup](../iOS_SETUP)
- [Build Instructions](../BUILD)
