# LocalStream - API Reference

Complete API documentation for developers and advanced users.

---

## Overview

LocalStream provides both **REST API** and **Socket.IO real-time API** for programmatic control and integration.

---

## Base URLs

```
HTTP:  http://<SERVER_IP>:3000
HTTPS: https://<SERVER_IP>:3443
```

Replace `<SERVER_IP>` with your server's local IP address (e.g., `192.168.1.100`).

---

## REST API

### Health & Status

#### GET /health

Health check endpoint for monitoring server status.

**Request:**
```http
GET /health HTTP/1.1
Host: 192.168.1.100:3000
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "streams": 2,
  "uptime": 3600.5
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Server status (`"ok"` or `"error"`) |
| `streams` | number | Number of active streams |
| `uptime` | number | Server uptime in seconds |

---

### Configuration

#### GET /api/config

Get current server configuration.

**Request:**
```http
GET /api/config HTTP/1.1
Host: 192.168.1.100:3000
```

**Response:** `200 OK`
```json
{
  "webrtc": {
    "iceServers": []
  },
  "video": {
    "defaultConstraints": {
      "width": { "ideal": 1920 },
      "height": { "ideal": 1080 },
      "frameRate": { "ideal": 60 },
      "facingMode": "user"
    },
    "presets": {
      "2k30": {
        "width": 2560,
        "height": 1440,
        "frameRate": 30,
        "bitrate": 8000000,
        "description": "2K 30fps (8 Mbps)"
      },
      "1080p30": {
        "width": 1920,
        "height": 1080,
        "frameRate": 30,
        "bitrate": 6000000,
        "description": "1080p 30fps (6 Mbps)"
      },
      "720p30": {
        "width": 1280,
        "height": 720,
        "frameRate": 30,
        "bitrate": 4000000,
        "description": "720p 30fps (4 Mbps)"
      }
    }
  },
  "serverURL": "https://192.168.1.100:3443"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `webrtc.iceServers` | Array | STUN/TURN server configuration |
| `video.defaultConstraints` | Object | Default video constraints |
| `video.presets` | Object | Available quality presets |
| `serverURL` | string | Primary server URL |

---

### Stream Management

#### GET /api/streams

Get list of all active streams.

**Request:**
```http
GET /api/streams HTTP/1.1
Host: 192.168.1.100:3000
```

**Response:** `200 OK`
```json
[
  {
    "id": "stream-1734262800000",
    "name": "Camera 1",
    "status": "active",
    "viewers": 1,
    "createdAt": "2025-12-15T10:30:00.000Z",
    "stats": {
      "bitrate": 6000000,
      "fps": 30,
      "resolution": "1920x1080"
    }
  },
  {
    "id": "stream-1734262900000",
    "name": "iPhone Camera",
    "status": "active",
    "viewers": 2,
    "createdAt": "2025-12-15T10:31:40.000Z",
    "stats": {
      "bitrate": 4000000,
      "fps": 30,
      "resolution": "1280x720"
    }
  }
]
```

**Stream Object:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique stream identifier |
| `name` | string | Human-readable stream name |
| `status` | string | Stream status (`"active"`, `"paused"`, `"stopped"`) |
| `viewers` | number | Number of connected viewers |
| `createdAt` | string | ISO 8601 timestamp of stream creation |
| `stats.bitrate` | number | Current bitrate in bits per second |
| `stats.fps` | number | Current frames per second |
| `stats.resolution` | string | Current resolution (e.g., `"1920x1080"`) |

---

### QR Code Generation

#### GET /api/qr/mobile

Generate QR code for mobile streamer access.

**Request:**
```http
GET /api/qr/mobile HTTP/1.1
Host: 192.168.1.100:3000
```

**Response:** `200 OK`
```json
{
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "url": "https://192.168.1.100:3443/mobile"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `qr` | string | Base64-encoded PNG QR code (data URI) |
| `url` | string | URL encoded in QR code |

**Usage Example:**
```html
<img src="data:image/png;base64,..." alt="Scan to access mobile streamer">
```

---

## Socket.IO API

### Connection

**Endpoint:** `/socket.io/`

**Client Library:**
```html
<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();
</script>
```

**Connection Options:**
```javascript
const socket = io({
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: true
});
```

---

### Events Reference

### Client → Server Events

#### register-streamer

Register client as a camera streamer.

**Emit:**
```javascript
socket.emit('register-streamer', {
  streamId: 'stream-1234567890',  // Optional: custom ID
  name: 'iPhone 13 Camera',       // Optional: display name
  resolution: '1920x1080',        // Optional: initial resolution
  quality: '1080p30'              // Optional: preset name
});
```

**Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `streamId` | string | No | Custom stream ID (auto-generated if omitted) |
| `name` | string | No | Display name (default: `"Camera N"`) |
| `resolution` | string | No | Initial resolution |
| `quality` | string | No | Quality preset key |

**Response:** `registered` event (see below)

---

#### register-viewer

Register client as a stream viewer.

**Emit:**
```javascript
socket.emit('register-viewer', {
  streamId: 'stream-1234567890'
});
```

**Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `streamId` | string | Yes | ID of stream to view |

**Response:** `registered` event or `error` event

---

#### offer

Send WebRTC offer to establish connection.

**Emit:**
```javascript
socket.emit('offer', {
  to: '<socket-id>',
  offer: rtcPeerConnection.localDescription,
  streamId: 'stream-1234567890'
});
```

**Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Target socket ID |
| `offer` | RTCSessionDescription | Yes | WebRTC offer |
| `streamId` | string | Yes | Stream identifier |

---

#### answer

Send WebRTC answer in response to offer.

**Emit:**
```javascript
socket.emit('answer', {
  to: '<socket-id>',
  answer: rtcPeerConnection.localDescription
});
```

**Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Target socket ID |
| `answer` | RTCSessionDescription | Yes | WebRTC answer |

---

#### ice-candidate

Send ICE candidate for NAT traversal.

**Emit:**
```javascript
socket.emit('ice-candidate', {
  to: '<socket-id>',
  candidate: event.candidate
});
```

**Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Target socket ID |
| `candidate` | RTCIceCandidate | Yes | ICE candidate |

---

#### stats-update

Update stream statistics.

**Emit:**
```javascript
socket.emit('stats-update', {
  role: 'streamer',
  bitrate: 6000000,
  fps: 30,
  resolution: '1920x1080',
  latency: 45
});
```

**Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | Yes | `"streamer"` or `"viewer"` |
| `bitrate` | number | No | Bitrate in bps |
| `fps` | number | No | Frames per second |
| `resolution` | string | No | Current resolution |
| `latency` | number | No | Round-trip latency (ms) |

---

### Server → Client Events

#### registered

Confirmation of successful registration.

**For Streamer:**
```javascript
socket.on('registered', (data) => {
  console.log('Stream ID:', data.streamId);
  console.log('Viewer URL:', data.viewerURL);
});
```

**Data (Streamer):**
```json
{
  "streamId": "stream-1734262800000",
  "viewerURL": "http://192.168.1.100:3000/viewer?stream=stream-1734262800000"
}
```

**For Viewer:**
```javascript
socket.on('registered', (data) => {
  console.log('Stream ID:', data.streamId);
  console.log('Streamer Socket:', data.streamerSocketId);
});
```

**Data (Viewer):**
```json
{
  "streamId": "stream-1734262800000",
  "streamerSocketId": "abc123def456"
}
```

---

#### offer

Forwarded WebRTC offer from peer.

**Listen:**
```javascript
socket.on('offer', async (data) => {
  await peerConnection.setRemoteDescription(data.offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit('answer', {
    to: data.from,
    answer: answer
  });
});
```

**Data:**
```json
{
  "from": "abc123def456",
  "offer": { "type": "offer", "sdp": "..." },
  "streamId": "stream-1734262800000"
}
```

---

#### answer

Forwarded WebRTC answer from peer.

**Listen:**
```javascript
socket.on('answer', async (data) => {
  await peerConnection.setRemoteDescription(data.answer);
});
```

**Data:**
```json
{
  "from": "xyz789ghi012",
  "answer": { "type": "answer", "sdp": "..." }
}
```

---

#### ice-candidate

Forwarded ICE candidate from peer.

**Listen:**
```javascript
socket.on('ice-candidate', async (data) => {
  if (data.candidate) {
    await peerConnection.addIceCandidate(data.candidate);
  }
});
```

**Data:**
```json
{
  "from": "abc123def456",
  "candidate": {
    "candidate": "candidate:...",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

---

#### streams-updated

Broadcast when active streams list changes.

**Listen:**
```javascript
socket.on('streams-updated', (streams) => {
  console.log('Active streams:', streams);
  updateStreamList(streams);
});
```

**Data:**
```json
[
  {
    "id": "stream-1734262800000",
    "name": "Camera 1",
    "status": "active",
    "viewers": 1,
    "createdAt": "2025-12-15T10:30:00.000Z",
    "stats": { "bitrate": 6000000, "fps": 30, "resolution": "1920x1080" }
  }
]
```

---

#### network-usage

Real-time network usage statistics.

**Listen:**
```javascript
socket.on('network-usage', (data) => {
  console.log(`Total: ${data.totalBitrate} bps`);
  console.log(`Streams: ${data.streamCount}`);
});
```

**Data:**
```json
{
  "totalBitrate": 12000000,
  "streamCount": 2
}
```

---

#### error

Error notification from server.

**Listen:**
```javascript
socket.on('error', (data) => {
  console.error('Server error:', data.message);
  alert(data.message);
});
```

**Data:**
```json
{
  "message": "Stream not found"
}
```

---

## WebRTC Integration

### Complete Example: Streamer

```javascript
const socket = io();
const streamId = `stream-${Date.now()}`;

// Get camera access
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: false
});

// Register as streamer
socket.emit('register-streamer', {
  streamId: streamId,
  name: 'My Camera',
  resolution: '1920x1080'
});

// Wait for registration
socket.on('registered', (data) => {
  console.log('Viewer URL:', data.viewerURL);

  // Create peer connection when viewer connects
  socket.on('offer', async (offerData) => {
    const pc = new RTCPeerConnection();

    // Add local stream tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: offerData.from,
          candidate: event.candidate
        });
      }
    };

    // Set remote offer and create answer
    await pc.setRemoteDescription(offerData.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('answer', {
      to: offerData.from,
      answer: answer
    });
  });

  // Handle incoming ICE candidates
  socket.on('ice-candidate', async (data) => {
    if (data.candidate) {
      await pc.addIceCandidate(data.candidate);
    }
  });
});
```

### Complete Example: Viewer

```javascript
const socket = io();
const streamId = new URLSearchParams(window.location.search).get('stream');

// Register as viewer
socket.emit('register-viewer', { streamId: streamId });

// Wait for registration
socket.on('registered', async (data) => {
  const pc = new RTCPeerConnection();

  // Handle incoming stream
  pc.ontrack = (event) => {
    const video = document.getElementById('remoteVideo');
    video.srcObject = event.streams[0];
  };

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        to: data.streamerSocketId,
        candidate: event.candidate
      });
    }
  };

  // Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit('offer', {
    to: data.streamerSocketId,
    offer: offer,
    streamId: streamId
  });

  // Handle answer
  socket.on('answer', async (answerData) => {
    await pc.setRemoteDescription(answerData.answer);
  });

  // Handle ICE candidates
  socket.on('ice-candidate', async (candidateData) => {
    if (candidateData.candidate) {
      await pc.addIceCandidate(candidateData.candidate);
    }
  });
});

// Handle errors
socket.on('error', (data) => {
  console.error('Error:', data.message);
});
```

---

## Error Codes

| Message | Cause | Solution |
|---------|-------|----------|
| `"Stream not found"` | Invalid streamId | Verify stream is active |
| `"Streamer not found"` | Streamer disconnected | Wait for streamer to reconnect |
| Connection timeout | Network issues | Check firewall/network settings |

---

## Rate Limiting

**Current Status:** No rate limiting implemented

**Recommendation:** Implement rate limiting in production deployments:
- Max 10 connections per IP per minute
- Max 5 streams per IP

---

## CORS Policy

```javascript
{
  origin: '*',
  methods: ['GET', 'POST']
}
```

**Note:** Permissive for local network use. Restrict in production.

---

## See Also

- [Architecture Documentation](ARCHITECTURE)
- [WebRTC Analysis](WebRTC_Analysis)
- [Setup Guides](wiki/)
