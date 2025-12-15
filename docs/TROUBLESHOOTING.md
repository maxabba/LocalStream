# LocalStream - Troubleshooting Guide

Comprehensive troubleshooting guide for common issues and solutions.

---

## Quick Diagnostics

### System Health Check

Run these commands to verify your setup:

```bash
# Check Node.js version (requires 18+)
node --version

# Check npm version
npm --version

# Verify LocalStream installation
npm list

# Test server startup
npm start
```

---

## Common Issues

### 1. iOS Camera Not Working

**Symptoms:**
- Camera permission denied
- Black screen on mobile
- "getUserMedia not supported" error

**Solutions:**

#### ✅ **Solution 1: Use HTTPS**
iOS requires HTTPS for camera access.

```bash
# Generate SSL certificates
npm run generate-cert

# Start server (will use HTTPS automatically)
npm start
```

Access mobile streamer via: `https://<YOUR_IP>:3443/mobile`

#### ✅ **Solution 2: Accept Security Certificate**
1. Visit `https://<YOUR_IP>:3443/mobile` on iPhone
2. Tap "Advanced" or "Details"
3. Tap "Visit this website" or "Accept Risk"
4. Reload the page

#### ✅ **Solution 3: Grant Camera Permission**
1. Go to iPhone Settings → Safari → Camera
2. Select "Ask" or "Allow"
3. Reload the mobile streamer page
4. Tap "Allow" when prompted

**Verification:**
```
✅ Using HTTPS URL (https://)
✅ Certificate accepted (no red warning)
✅ Camera permission granted
✅ Green indicator shows camera is active
```

---

### 2. OBS Shows Black Screen

**Symptoms:**
- OBS Browser Source is black
- Stream appears active on mobile
- Desktop dashboard shows viewer connected

**Solutions:**

#### ✅ **Solution 1: Use HTTP for OBS**
OBS works better with HTTP URLs.

**Correct:**
```
http://192.168.1.100:3000/viewer?stream=stream-1234567890
```

**Incorrect:**
```
https://192.168.1.100:3443/viewer?stream=stream-1234567890
```

#### ✅ **Solution 2: Verify Browser Source Settings**
1. In OBS, right-click the source → Properties
2. **URL**: Copy from mobile app (use HTTP version)
3. **Width**: `1920`
4. **Height**: `1080`
5. **FPS**: `60` (or match your stream FPS)
6. **Custom CSS**: Leave empty
7. ✅ Check "Shutdown source when not visible" (optional)
8. ✅ Check "Refresh browser when scene becomes active"

#### ✅ **Solution 3: Disable Hardware Acceleration**
1. OBS → Settings → Advanced
2. Uncheck "Enable Browser Hardware Acceleration"
3. Restart OBS

#### ✅ **Solution 4: Clear Browser Source Cache**
1. Right-click Browser Source → Interact
2. Right-click in the window → Reload
3. Or: Delete and re-add the Browser Source

**Verification:**
```bash
# Test viewer URL in regular browser first
open http://192.168.1.100:3000/viewer?stream=<stream-id>
```

---

### 3. High Latency / Lag

**Symptoms:**
- Delay > 500ms
- Choppy playback
- Audio/video desync (if audio enabled)

**Solutions:**

#### ✅ **Solution 1: Check Network**
```bash
# Ping test
ping 192.168.1.100

# Expected: <10ms on wired, <50ms on WiFi
```

**Improvements:**
- Use 5GHz WiFi instead of 2.4GHz
- Move closer to router
- Use wired Ethernet for server/OBS computer

#### ✅ **Solution 2: Reduce Stream Quality**
Lower quality = lower latency

On mobile streamer:
1. Tap quality selector
2. Choose **720p30** or **720p25**
3. Restart stream

**Quality vs Latency:**
| Quality | Bitrate | Expected Latency |
|---------|---------|------------------|
| 2K 30fps | 8 Mbps | 100-200ms |
| 1080p 30fps | 6 Mbps | 50-150ms |
| 720p 30fps | 4 Mbps | 30-100ms |
| 720p 25fps | 3 Mbps | 20-80ms |

#### ✅ **Solution 3: Close Other Applications**
- Stop other streaming/download applications
- Pause cloud sync (Dropbox, Google Drive, etc.)
- Close unused browser tabs

#### ✅ **Solution 4: Optimize WebRTC Settings**
For advanced users, edit `config.json`:

```json
{
  "webrtc": {
    "iceServers": []  // Empty = local only (fastest)
  }
}
```

**Verification:**
Check stats on desktop dashboard:
```
Bitrate: Stable (not fluctuating wildly)
FPS: Matches target (30 or 60)
Latency: <100ms
```

---

### 4. Connection Issues

**Symptoms:**
- "Failed to connect to server"
- "Stream not found"
- Infinite loading

**Solutions:**

#### ✅ **Solution 1: Verify Server is Running**
```bash
# Check server logs
npm start

# Should see:
# ✨ HTTPS Server running on port 3443
# ✨ HTTP Server running on port 3000
```

#### ✅ **Solution 2: Check Firewall**

**macOS:**
```bash
# Allow Node.js through firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

**Windows:**
```powershell
# Add firewall rule
netsh advfirewall firewall add rule name="LocalStream HTTP" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="LocalStream HTTPS" dir=in action=allow protocol=TCP localport=3443
```

**Linux:**
```bash
# Using ufw
sudo ufw allow 3000/tcp
sudo ufw allow 3443/tcp

# Or iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3443 -j ACCEPT
```

#### ✅ **Solution 3: Verify IP Address**
```bash
# Get local IP
ipconfig getifaddr en0  # macOS/Linux
ipconfig               # Windows
```

**Common mistakes:**
- ❌ Using `localhost` on mobile (won't work!)
- ❌ Using `127.0.0.1` on mobile (won't work!)
- ✅ Using actual LAN IP like `192.168.1.100`

#### ✅ **Solution 4: Same Network**
Ensure all devices are on the **same WiFi network**.

**Check:**
- Server: Connected to "Home WiFi"
- Mobile: Connected to "Home WiFi" (not mobile data!)
- OBS PC: Connected to "Home WiFi"

---

### 5. Stream Keeps Disconnecting

**Symptoms:**
- Connection drops after a few minutes
- "Streamer disconnected" message
- Must restart stream frequently

**Solutions:**

#### ✅ **Solution 1: Prevent Mobile Sleep**
iOS/Android will pause camera when screen turns off.

**On mobile:**
1. Open mobile streamer
2. Start streaming
3. Keep screen ON or use fullscreen mode
4. Consider disabling auto-lock temporarily

**Best Practice:**
- Use fullscreen mode (button in mobile UI)
- Plug in charger for long streams
- Disable auto-brightness

#### ✅ **Solution 2: Stable WiFi**
```bash
# Test connection stability
ping -c 100 192.168.1.100

# Look for:
# - 0% packet loss
# - Consistent latency (no spikes)
```

**Improvements:**
- Position router centrally
- Reduce interference (microwave, Bluetooth, etc.)
- Update router firmware

#### ✅ **Solution 3: Increase Socket.IO Timeout**
Edit `server.js` (advanced):

```javascript
// Line ~54
io = new Server({
  // ... other options
  pingTimeout: 120000,  // Increase from 60000
  pingInterval: 30000   // Increase from 25000
});
```

---

### 6. Poor Video Quality

**Symptoms:**
- Pixelated / blocky video
- Low resolution despite high setting
- Compression artifacts

**Solutions:**

#### ✅ **Solution 1: Increase Bitrate**
Higher bitrate = better quality

Edit `config.json`:

```json
{
  "video": {
    "presets": {
      "1080p30": {
        "bitrate": 8000000  // Increase from 6000000
      }
    }
  }
}
```

**Restart server after editing.**

#### ✅ **Solution 2: Better Lighting**
- Ensure good lighting on subject
- Avoid backlighting
- Use diffused light sources

#### ✅ **Solution 3: Reduce Motion**
- Video codecs struggle with fast motion
- Keep camera steady
- Avoid rapid panning

#### ✅ **Solution 4: Check OBS Settings**
In OBS Browser Source:
- Width: `1920` (not auto)
- Height: `1080` (not auto)
- FPS: `60` (or match stream)
- No custom CSS that resizes video

---

### 7. Audio Issues

**Note:** Audio is **disabled by default** in LocalStream.

**To Enable Audio:**

1. Edit `public/mobile/streamer.js`
2. Find lines ~295 and ~465:
   ```javascript
   audio: true  // Change from false
   ```
3. Save and restart server
4. Reload mobile page

**Common Audio Issues:**

#### Problem: No Audio in OBS
**Solution:**
- Verify audio is enabled (see above)
- Check OBS audio mixer (ensure not muted)
- Test viewer URL in browser first

#### Problem: Audio Echo
**Solution:**
- Disable microphone on viewer device
- Use headphones on viewer device

#### Problem: Audio/Video Desync
**Solution:**
- Reduce stream quality
- Improve network connection
- Lower OBS encoding load

---

### 8. Server Won't Start

**Symptoms:**
- `npm start` fails
- "Port already in use" error
- Permission errors

**Solutions:**

#### ✅ **Solution 1: Kill Existing Process**

**macOS/Linux:**
```bash
# Find process on port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or port 3443
kill -9 $(lsof -ti:3443)
```

**Windows:**
```powershell
# Find process
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

#### ✅ **Solution 2: Use Different Ports**
Edit `config.json`:

```json
{
  "server": {
    "port": 3001,      // Changed from 3000
    "httpsPort": 3444  // Changed from 3443
  }
}
```

#### ✅ **Solution 3: Fix Permissions**

**macOS/Linux:**
```bash
# Option 1: Use sudo (not recommended)
sudo npm start

# Option 2: Fix ownership
sudo chown -R $USER:$USER .
```

**Windows:**
Run Command Prompt as Administrator.

---

## Advanced Diagnostics

### Network Testing

```bash
# Test local network speed
iperf3 -s  # On server
iperf3 -c <SERVER_IP>  # On mobile/client

# Expected: >100 Mbps on wired, >50 Mbps on WiFi
```

### WebRTC Connection Logs

Open browser console (F12) on mobile/viewer:

```javascript
// Check connection state
console.log('Connection State:', peerConnection.connectionState);
console.log('ICE State:', peerConnection.iceConnectionState);
console.log('Signaling State:', peerConnection.signalingState);

// Expected when working:
// Connection State: connected
// ICE State: connected
// Signaling State: stable
```

### Server Logs

Enable verbose logging:

```bash
# Set environment variable
DEBUG=* npm start

# Or
NODE_DEBUG=http,net npm start
```

---

## Performance Optimization

### Server-Side

```json
// config.json - Optimized for LAN
{
  "server": {
    "host": "0.0.0.0"  // Bind to all interfaces
  },
  "webrtc": {
    "iceServers": []  // Empty for LAN-only (faster)
  }
}
```

### Client-Side

**Mobile Streamer:**
- Close background apps
- Disable battery saver mode
- Use wired charging during stream
- Clear browser cache before starting

**OBS Viewer:**
- Lower OBS canvas resolution if needed
- Disable unnecessary sources
- Use hardware encoding (NVENC/QuickSync)
- Close other browsers/applications

---

## Error Messages Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| `getUserMedia not supported` | Browser lacks camera API | Use HTTPS on iOS, update browser |
| `Permission denied` | Camera access blocked | Grant permission in browser settings |
| `NotReadableError` | Camera in use by another app | Close other camera apps |
| `Stream not found` | Invalid stream ID | Verify stream is active |
| `Failed to fetch` | Server unreachable | Check firewall, verify IP address |
| `ICE failed` | Network connection issue | Check NAT, firewall, WiFi |
| `DOMException: play() failed` | Autoplay blocked | Click to start playback |

---

## Getting Help

### Before Asking for Help

1. ✅ Check this troubleshooting guide
2. ✅ Search existing GitHub issues
3. ✅ Collect error messages (console logs)
4. ✅ Note your setup (OS, browser versions, network type)

### Where to Get Help

- **GitHub Issues**: [Report Bug](https://github.com/maxabba/LocalStream/issues)
- **Documentation**: [Setup Guides](../wiki/)
- **Discord/Forum**: (if available)

### Information to Include

When reporting issues, include:

```
OS: macOS 14.0 / Windows 11 / Ubuntu 22.04
Node.js: v20.10.0
Browser (mobile): Safari 17 / Chrome 120
Browser (OBS): OBS 30.0 (Chromium)
Network: WiFi 5GHz / Ethernet
Error message: [paste full error]
Steps to reproduce: [detailed steps]
```

---

## FAQ

**Q: Can I use LocalStream over the internet?**
A: Not recommended. Designed for local network only. Internet streaming requires TURN servers.

**Q: Why is there lag even on local network?**
A: Check WiFi signal, reduce quality, ensure no other bandwidth-heavy apps.

**Q: Can I stream multiple cameras simultaneously?**
A: Yes! Each device can run its own stream instance.

**Q: Does it work with Zoom/Teams?**
A: No. Designed specifically for OBS. Use virtual camera software for Zoom/Teams.

**Q: Why does my stream stop when phone screen locks?**
A: iOS/Android pause camera when screen off. Keep screen on or use fullscreen mode.

**Q: Can I record streams on the server?**
A: Not built-in. Use OBS recording or write custom server-side recording logic.

---

## See Also

- [Architecture](ARCHITECTURE) - System design and components
- [API Reference](API_REFERENCE) - Developer API documentation
- [Setup Guides](../wiki/) - Installation and configuration
- [iOS Setup](../iOS_SETUP) - iOS-specific instructions
- [OBS Setup](../OBS_SETUP) - OBS integration guide
