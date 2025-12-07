/**
 * Mobile Streamer Application
 * Handles camera access, WebRTC streaming, and UI controls
 */

let socket;
let webrtcClient;
let localStream;
let streamId;
let config;
let isStreaming = false;

// DOM Elements
const localVideo = document.getElementById('localVideo');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const qualityPreset = document.getElementById('qualityPreset');
const cameraSelect = document.getElementById('cameraSelect');
const streamName = document.getElementById('streamName');
const viewerUrlContainer = document.getElementById('viewerUrlContainer');
const viewerUrl = document.getElementById('viewerUrl');
const copyUrlBtn = document.getElementById('copyUrlBtn');
const connectionStatus = document.getElementById('connectionStatus');
const statsPanel = document.getElementById('statsPanel');
const toggleStats = document.getElementById('toggleStats');

// Stats elements
const resolutionEl = document.getElementById('resolution');
const fpsEl = document.getElementById('fps');
const bitrateEl = document.getElementById('bitrate');
const latencyEl = document.getElementById('latency');
const connStateEl = document.getElementById('connState');
const iceStateEl = document.getElementById('iceState');
const packetsLostEl = document.getElementById('packetsLost');
const viewersEl = document.getElementById('viewers');

// Initialize
async function init() {
    // Check WebRTC support
    const support = checkWebRTCSupport();
    if (!support.supported) {
        showToast('WebRTC not supported on this device', 'error', 5000);
        return;
    }

    console.log('Device:', support.device, 'Browser:', support.browser);

    // Load configuration
    try {
        const response = await fetch('/api/config');
        config = await response.json();
        console.log('Configuration loaded:', config);
    } catch (error) {
        console.error('Failed to load config:', error);
        showToast('Failed to connect to server', 'error');
        return;
    }

    // Connect to signaling server
    connectToServer();

    // Event listeners
    startBtn.addEventListener('click', startStreaming);
    stopBtn.addEventListener('click', stopStreaming);
    cameraSelect.addEventListener('change', switchCamera);
    copyUrlBtn.addEventListener('click', copyUrl);
    toggleStats.addEventListener('click', toggleStatsPanel);

    // Prevent screen sleep on mobile
    if ('wakeLock' in navigator) {
        try {
            const wakeLock = await navigator.wakeLock.request('screen');
            console.log('Screen wake lock activated');
        } catch (err) {
            console.log('Wake lock failed:', err);
        }
    }

    // Initialize fullscreen and camera controls
    initFullscreenControls();
}

// Initialize fullscreen and camera controls
function initFullscreenControls() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const fullscreenOverlay = document.getElementById('fullscreenOverlay');
    const fullscreenVideo = document.getElementById('fullscreenVideo');
    const exitFullscreen = document.getElementById('exitFullscreen');
    const toggleControls = document.getElementById('toggleControls');
    const cameraControls = document.getElementById('cameraControls');

    // Camera control elements
    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const saturationSlider = document.getElementById('saturation');
    const whiteBalanceSelect = document.getElementById('whiteBalance');
    const colorTempSlider = document.getElementById('colorTemperature');
    const colorTempGroup = document.getElementById('colorTempGroup');
    const resetBtn = document.getElementById('resetControls');

    // Value display elements
    const brightnessValue = document.getElementById('brightnessValue');
    const contrastValue = document.getElementById('contrastValue');
    const saturationValue = document.getElementById('saturationValue');
    const whiteBalanceValue = document.getElementById('whiteBalanceValue');
    const colorTempValue = document.getElementById('colorTempValue');

    // Enter fullscreen
    fullscreenBtn.addEventListener('click', () => {
        fullscreenOverlay.classList.add('active');
        fullscreenVideo.srcObject = localVideo.srcObject;
    });

    // Exit fullscreen
    exitFullscreen.addEventListener('click', () => {
        fullscreenOverlay.classList.remove('active');
        cameraControls.classList.remove('active');
    });

    // Toggle controls panel
    toggleControls.addEventListener('click', () => {
        cameraControls.classList.toggle('active');
    });

    // Apply camera filters
    function applyCameraFilters() {
        const brightness = parseFloat(brightnessSlider.value);
        const contrast = parseFloat(contrastSlider.value);
        const saturation = parseFloat(saturationSlider.value);

        const filter = `brightness(${1 + brightness}) contrast(${contrast}) saturate(${saturation})`;
        fullscreenVideo.style.filter = filter;
        localVideo.style.filter = filter;
    }

    // Brightness control
    brightnessSlider.addEventListener('input', (e) => {
        brightnessValue.textContent = e.target.value;
        applyCameraFilters();
    });

    // Contrast control
    contrastSlider.addEventListener('input', (e) => {
        contrastValue.textContent = e.target.value;
        applyCameraFilters();
    });

    // Saturation control
    saturationSlider.addEventListener('input', (e) => {
        saturationValue.textContent = e.target.value;
        applyCameraFilters();
    });

    // White balance control
    whiteBalanceSelect.addEventListener('change', async (e) => {
        whiteBalanceValue.textContent = e.target.value === 'auto' ? 'Auto' : 'Manual';

        if (e.target.value === 'manual') {
            colorTempGroup.style.display = 'block';
        } else {
            colorTempGroup.style.display = 'none';
        }

        // Try to apply white balance to camera track (if supported)
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();

            if (capabilities.whiteBalanceMode) {
                try {
                    await videoTrack.applyConstraints({
                        advanced: [{
                            whiteBalanceMode: e.target.value
                        }]
                    });
                    console.log('White balance mode applied:', e.target.value);
                } catch (err) {
                    console.log('White balance not supported:', err);
                }
            }
        }
    });

    // Color temperature control
    colorTempSlider.addEventListener('input', async (e) => {
        const temp = e.target.value;
        colorTempValue.textContent = `${temp}K`;

        // Try to apply color temperature (if supported)
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();

            if (capabilities.colorTemperature) {
                try {
                    await videoTrack.applyConstraints({
                        advanced: [{
                            colorTemperature: parseInt(temp)
                        }]
                    });
                    console.log('Color temperature applied:', temp);
                } catch (err) {
                    console.log('Color temperature not supported:', err);
                }
            }
        }
    });

    // Reset all controls
    resetBtn.addEventListener('click', () => {
        brightnessSlider.value = 0;
        contrastSlider.value = 1;
        saturationSlider.value = 1;
        whiteBalanceSelect.value = 'auto';
        colorTempSlider.value = 6500;

        brightnessValue.textContent = '0';
        contrastValue.textContent = '1';
        saturationValue.textContent = '1';
        whiteBalanceValue.textContent = 'Auto';
        colorTempValue.textContent = '6500K';
        colorTempGroup.style.display = 'none';

        applyCameraFilters();

        // Reset camera settings
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            videoTrack.applyConstraints({
                advanced: [{
                    whiteBalanceMode: 'continuous'
                }]
            }).catch(err => console.log('Reset failed:', err));
        }

        showToast('Camera settings reset', 'success');
    });
}

// Connect to signaling server
function connectToServer() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
        updateConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus('disconnected');
    });

    socket.on('registered', (data) => {
        streamId = data.streamId;
        console.log('Registered as streamer:', streamId);

        if (data.viewerURL) {
            viewerUrl.value = data.viewerURL;
            viewerUrlContainer.style.display = 'block';
        }
    });

    socket.on('offer', async (data) => {
        console.log('Received offer from viewer:', data.from);
        await handleViewerConnection(data);
    });

    socket.on('ice-candidate', async (data) => {
        if (webrtcClient && data.candidate) {
            await webrtcClient.handleIceCandidate(data.candidate);
        }
    });

    socket.on('error', (data) => {
        console.error('Server error:', data.message);
        showToast(data.message, 'error');
    });
}

// Start streaming
async function startStreaming() {
    try {
        startBtn.disabled = true;
        showToast('Starting camera...', 'info');

        // Get selected quality preset
        const preset = config.video.presets[qualityPreset.value];
        const facingMode = cameraSelect.value;

        // Get user media
        const constraints = {
            video: {
                width: { ideal: preset.width },
                height: { ideal: preset.height },
                frameRate: { ideal: preset.frameRate },
                facingMode: facingMode
            },
            audio: true
        };

        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = localStream;

        // Get actual video settings
        const videoTrack = localStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        console.log('Video settings:', settings);

        // Update resolution display
        resolutionEl.textContent = formatResolution(settings.width, settings.height);

        // Initialize WebRTC client
        webrtcClient = new WebRTCClient({
            iceServers: config.webrtc.iceServers,
            onConnectionStateChange: handleConnectionStateChange,
            onStats: handleStats
        });

        webrtcClient.socket = socket;
        webrtcClient.initPeerConnection();
        webrtcClient.addLocalStream(localStream);

        // Register as streamer
        socket.emit('register-streamer', {
            name: streamName.value,
            resolution: `${settings.width}x${settings.height}`,
            frameRate: settings.frameRate
        });

        // Update UI
        isStreaming = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        qualityPreset.disabled = true;
        cameraSelect.disabled = true;
        streamName.disabled = true;
        updateConnectionStatus('streaming');

        showToast('Streaming started!', 'success');

    } catch (error) {
        console.error('Failed to start streaming:', error);
        showToast('Failed to access camera: ' + error.message, 'error', 5000);
        startBtn.disabled = false;
    }
}

// Stop streaming
function stopStreaming() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        localVideo.srcObject = null;
    }

    if (webrtcClient) {
        webrtcClient.close();
        webrtcClient = null;
    }

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    // Update UI
    isStreaming = false;
    startBtn.style.display = 'block';
    startBtn.disabled = false; // Re-enable the button
    stopBtn.style.display = 'none';
    qualityPreset.disabled = false;
    cameraSelect.disabled = false;
    streamName.disabled = false;
    viewerUrlContainer.style.display = 'none';
    updateConnectionStatus('disconnected');

    // Reset stats
    resolutionEl.textContent = '-';
    fpsEl.textContent = '-';
    bitrateEl.textContent = '-';
    latencyEl.textContent = '-';

    showToast('Streaming stopped', 'info');

    // Reconnect to server
    setTimeout(() => {
        connectToServer();
    }, 1000);
}

// Handle viewer connection
async function handleViewerConnection(data) {
    try {
        await webrtcClient.handleOffer(data.offer);
        const answer = await webrtcClient.createAnswer();

        socket.emit('answer', {
            to: data.from,
            answer: answer
        });

        console.log('Sent answer to viewer');
        viewersEl.textContent = '1'; // Simplified - would need server tracking for multiple viewers
    } catch (error) {
        console.error('Failed to handle viewer connection:', error);
    }
}

// Handle connection state changes
function handleConnectionStateChange(state) {
    console.log('Connection state:', state);
    connStateEl.textContent = state;

    if (state === 'connected') {
        showToast('Viewer connected!', 'success');
    } else if (state === 'disconnected' || state === 'failed') {
        showToast('Viewer disconnected', 'warning');
    }
}

// Handle WebRTC statistics
function handleStats(stats) {
    // Update FPS
    if (stats.video.fps > 0) {
        fpsEl.textContent = `${stats.video.fps} fps`;
        fpsEl.style.color = getQualityColor(stats.video.fps, 'fps');
    }

    // Update bitrate
    if (stats.video.bitrate > 0) {
        bitrateEl.textContent = formatBitrate(stats.video.bitrate);
    }

    // Update latency
    if (stats.connection.rtt > 0) {
        const latency = Math.round(stats.connection.rtt);
        latencyEl.textContent = `${latency} ms`;
        latencyEl.style.color = getQualityColor(latency, 'latency');
    }

    // Update advanced stats
    packetsLostEl.textContent = stats.video.packetsLost || '0';

    // Send stats to server
    socket.emit('stats-update', {
        bitrate: stats.video.bitrate,
        fps: stats.video.fps,
        resolution: `${stats.video.width}x${stats.video.height}`,
        latency: stats.connection.rtt
    });
}

// Switch camera
async function switchCamera() {
    if (!isStreaming) return;

    try {
        const facingMode = cameraSelect.value;
        const preset = config.video.presets[qualityPreset.value];

        const constraints = {
            video: {
                width: { ideal: preset.width },
                height: { ideal: preset.height },
                frameRate: { ideal: preset.frameRate },
                facingMode: facingMode
            },
            audio: true
        };

        // Stop current stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        // Get new stream
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = localStream;

        // Update WebRTC connection
        if (webrtcClient && webrtcClient.peerConnection) {
            const videoTrack = localStream.getVideoTracks()[0];
            const sender = webrtcClient.peerConnection.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(videoTrack);
            }
        }

        showToast('Camera switched', 'success');
    } catch (error) {
        console.error('Failed to switch camera:', error);
        showToast('Failed to switch camera', 'error');
    }
}

// Copy viewer URL
async function copyUrl() {
    const success = await copyToClipboard(viewerUrl.value);
    if (success) {
        showToast('URL copied to clipboard!', 'success');
        copyUrlBtn.textContent = '✓ Copied';
        setTimeout(() => {
            copyUrlBtn.textContent = '📋 Copy';
        }, 2000);
    } else {
        showToast('Failed to copy URL', 'error');
    }
}

// Toggle stats panel
function toggleStatsPanel() {
    const isVisible = statsPanel.style.display !== 'none';
    statsPanel.style.display = isVisible ? 'none' : 'block';
    toggleStats.textContent = isVisible ? 'Show Advanced Stats' : 'Hide Advanced Stats';
}

// Update connection status
function updateConnectionStatus(status) {
    connectionStatus.className = `status-indicator ${status}`;

    const statusText = {
        'disconnected': 'Disconnected',
        'connected': 'Connected',
        'streaming': 'Streaming'
    };

    connectionStatus.querySelector('.status-text').textContent = statusText[status] || status;
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
