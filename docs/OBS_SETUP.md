# OBS Setup Guide - LocalStream

Complete guide for integrating LocalStream with OBS Studio.

## Prerequisites

- OBS Studio 27.0 or later
- LocalStream server running
- Active stream from mobile device

## Step-by-Step Setup

### 1. Start Your Mobile Stream

1. Open `http://[SERVER-IP]:3000/mobile` on your mobile device
2. Allow camera and microphone permissions
3. Select your desired quality preset
4. Tap "Start Streaming"
5. **Copy the Viewer URL** that appears (e.g., `http://192.168.1.100:3000/viewer?stream=stream-xxxxx`)

### 2. Add Browser Source in OBS

1. In OBS Studio, locate the **Sources** panel (usually bottom-left)
2. Click the **+** (plus) button
3. Select **Browser** from the list
4. Give it a name (e.g., "Mobile Camera 1", "Phone Front Cam", etc.)
5. Click **OK**

### 3. Configure Browser Source

In the Browser Source properties window:

#### URL
Paste the viewer URL you copied from the mobile app:
```
http://192.168.1.100:3000/viewer?stream=stream-xxxxx
```

#### Dimensions
Set based on your stream quality:

**For 1080p streams:**
- Width: `1920`
- Height: `1080`

**For 4K streams:**
- Width: `3840`
- Height: `2160`

**For 720p streams:**
- Width: `1280`
- Height: `720`

#### FPS
Match your mobile stream settings:
- `60` for 60fps presets
- `30` for 30fps presets

#### Important Settings

✅ **Check these:**
- ☑ Refresh browser when scene becomes active
- ☑ Control audio via OBS (if you want audio)

❌ **Uncheck these:**
- ☐ Shutdown source when not visible (important for maintaining connection)

#### CSS (Optional)
Leave blank unless you want custom styling.

### 4. Click OK

Your mobile camera stream should now appear in OBS!

## Recommended OBS Settings

### For Best Performance

**Video Settings** (Settings → Video):
- Base Canvas: Match your stream output (e.g., 1920x1080)
- Output Resolution: Same as base canvas
- FPS: 60 or 30 (match your mobile stream)

**Output Settings** (Settings → Output):
- Encoder: Hardware encoder if available (NVENC, QuickSync, etc.)
- Rate Control: CBR
- Bitrate: 6000-10000 kbps for streaming, higher for recording

### Browser Source Advanced Settings

Right-click the Browser Source → Properties → Advanced:

- **Custom CSS**: Leave empty
- **Use custom frame rate**: ✅ Checked
- **FPS**: Match your stream (30 or 60)

## Multiple Camera Setup

To use multiple mobile devices as cameras:

1. Start streaming on each mobile device
2. Each will get a unique viewer URL
3. Add a separate Browser Source in OBS for each camera
4. Name them clearly (e.g., "Phone 1 - Front", "Phone 2 - Back", "Tablet - Wide")

### Example Multi-Cam Scene

```
Scene: Multi-Camera
├── Browser Source: "Phone 1" (Main view)
├── Browser Source: "Phone 2" (Picture-in-picture)
└── Browser Source: "Tablet" (Overhead view)
```

## Positioning and Transformations

### Resize and Position

1. Click the Browser Source in the preview
2. Drag corners to resize
3. Drag center to move
4. Hold `Shift` while dragging to maintain aspect ratio

### Transform Options

Right-click the source → Transform:
- **Fit to screen**: Fills the entire canvas
- **Stretch to screen**: Fills canvas (may distort)
- **Center to screen**: Centers the source
- **Rotate 90° CW/CCW**: Rotate the video
- **Flip Horizontal/Vertical**: Mirror the video

## Audio Configuration

### Enable Audio from Stream

1. Right-click the Browser Source
2. Ensure "Control audio via OBS" is checked in properties
3. Adjust volume in the Audio Mixer panel

### Disable Audio (Video Only)

1. In the Audio Mixer, click the speaker icon next to the Browser Source
2. Or set volume to 0%

### Advanced Audio

Settings → Audio → Advanced:
- Set monitoring device if you want to hear the audio
- Configure audio delay if sync issues occur

## Troubleshooting

### Stream Not Showing

**Problem**: Black screen or "Connecting..." message

**Solutions**:
1. Verify the viewer URL is correct
2. Check that mobile device is still streaming
3. Ensure both devices are on the same WiFi network
4. Try refreshing the Browser Source:
   - Right-click source → Refresh
   - Or toggle "Refresh browser when scene becomes active"

### Audio Not Working

**Problem**: No audio from the stream

**Solutions**:
1. Check "Control audio via OBS" is enabled in Browser Source properties
2. Verify audio is not muted in OBS Audio Mixer
3. Check mobile device microphone permissions
4. Ensure mobile device is not muted

### Lag or Stuttering

**Problem**: Video is choppy or delayed

**Solutions**:
1. **Reduce quality**: Use 720p60 or 1080p30 instead of 4K
2. **Improve WiFi**: 
   - Use 5GHz WiFi instead of 2.4GHz
   - Move closer to router
   - Reduce interference from other devices
3. **OBS Settings**:
   - Lower canvas resolution
   - Use hardware encoder
   - Reduce other source complexity
4. **Mobile Device**:
   - Close background apps
   - Ensure good battery level
   - Disable battery saver mode

### Connection Drops

**Problem**: Stream disconnects frequently

**Solutions**:
1. Keep mobile screen on during streaming
2. Disable battery optimization for browser
3. Use stronger WiFi signal
4. Check "Refresh browser when scene becomes active" in OBS
5. Restart the stream and OBS

### Aspect Ratio Issues

**Problem**: Video is stretched or has black bars

**Solutions**:
1. Ensure Browser Source dimensions match stream resolution
2. Right-click source → Transform → Fit to screen
3. Hold Shift while resizing to maintain aspect ratio

## Advanced Tips

### Scene Transitions

When switching scenes with the Browser Source:
- Enable "Refresh browser when scene becomes active"
- This ensures the connection is maintained

### Filters

Add filters to enhance the stream:
1. Right-click Browser Source → Filters
2. Useful filters:
   - **Color Correction**: Adjust brightness, contrast, saturation
   - **Chroma Key**: Remove background (if using green screen)
   - **Crop/Pad**: Remove edges or add padding
   - **Sharpen**: Enhance detail

### Hotkeys

Set up hotkeys for quick control:
1. Settings → Hotkeys
2. Search for your Browser Source name
3. Set keys for:
   - Show/Hide source
   - Refresh browser source

### Studio Mode

Use Studio Mode for smooth transitions:
1. Enable Studio Mode (button in OBS controls)
2. Preview changes before going live
3. Transition smoothly between scenes

## Performance Optimization

### For Smooth 60fps

1. **Mobile**: Use 1080p60 or 720p60 preset
2. **OBS**: Set canvas to 60fps
3. **Network**: Use 5GHz WiFi, strong signal
4. **Hardware**: Use GPU encoding in OBS

### For Multiple Streams

1. Use lower quality presets (720p30) for secondary cameras
2. Prioritize main camera with higher quality
3. Monitor CPU/GPU usage in OBS stats
4. Consider reducing canvas resolution if needed

### Bandwidth Management

**Estimated bandwidth per stream:**
- 4K60: ~20 Mbps
- 1080p60: ~10 Mbps
- 1080p30: ~5 Mbps
- 720p60: ~6 Mbps
- 720p30: ~3 Mbps

**For multiple streams**, ensure your WiFi can handle the total:
- Example: 2x 1080p60 = ~20 Mbps total

## Common Use Cases

### Facecam Setup

1. Use front camera on phone
2. 720p60 or 1080p30 preset
3. Position as picture-in-picture in corner
4. Add circular crop filter for clean look

### Product Demo

1. Use back camera for better quality
2. 1080p60 or 4K30 preset
3. Position overhead or at angle
4. Add color correction filter

### Multi-Angle Coverage

1. Multiple phones at different angles
2. Switch between them or show all
3. Use 720p30 to conserve bandwidth
4. Name sources clearly for easy switching

### Wireless Interview

1. Phone as secondary camera
2. 1080p30 preset for stability
3. Enable audio for interview subject
4. Use as B-roll or split screen

## Keyboard Shortcuts Reference

| Action | Default Shortcut |
|--------|-----------------|
| Start/Stop Streaming | Not set (configure in Hotkeys) |
| Start/Stop Recording | Not set |
| Studio Mode | Not set |
| Refresh Browser Source | Not set (recommended to set) |

Configure these in Settings → Hotkeys for faster workflow.

## Getting Help

If you encounter issues:

1. Check the main README troubleshooting section
2. Verify all settings match this guide
3. Test with lower quality preset
4. Check OBS logs (Help → Log Files)
5. Restart OBS and the LocalStream server

---

**Happy Streaming! 🎥**
