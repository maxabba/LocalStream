# iOS Setup Guide

Complete guide for using LocalStream on iPhone and iPad.

## Quick Start

### 1. Server is Running

The server is now running in **HTTPS mode** (required for iOS):

```
🔒 HTTPS Mode (iOS/Safari Compatible)
📱 Mobile: https://192.168.1.70:3443/mobile
```

### 2. Open on iPhone

1. Open **Safari** on your iPhone
2. Go to: `https://192.168.1.70:3443/mobile`

### 3. Accept Security Warning

You'll see "This Connection Is Not Private"

**Steps:**
1. Tap **"Show Details"**
2. Tap **"visit this website"**
3. Tap **"Visit Website"** again

> This is safe - you're connecting to your own local server!

### 4. Allow Permissions

1. Tap **"Start Streaming"**
2. Allow **Camera** access
3. Allow **Microphone** access

### 5. Start Streaming!

- Select quality (1080p60 recommended)
- Choose camera (front/back)
- Tap "Start Streaming"
- Copy viewer URL for OBS

## Why HTTPS?

iOS requires HTTPS for camera access when accessing from network. This is an Apple security feature.

## Troubleshooting

### Still Getting "WebRTC Not Supported"?

1. Make sure you're using `https://` (not `http://`)
2. Verify certificate was accepted
3. Try clearing Safari cache
4. Update iOS to latest version

### Can't Accept Certificate?

Try manually installing it:

1. Settings → General → VPN & Device Management
2. Install the downloaded certificate
3. Settings → General → About → Certificate Trust Settings
4. Enable trust for localhost certificate

### Connection Drops?

1. Disable Low Power Mode
2. Keep screen on while streaming
3. Use 5GHz WiFi
4. Disable background app refresh for Safari

## Full Documentation

For complete instructions and troubleshooting, see:
- [iOS Setup Guide](file:///Users/marcoabbattista/.gemini/antigravity/brain/43ab3c09-893f-4149-a280-ed8924ffe117/iOS_SETUP.md)

---

**Need help?** Check the server terminal for error messages or try restarting both server and iPhone.
