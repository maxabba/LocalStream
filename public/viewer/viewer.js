/**
 * OBS Viewer Application
 * Receives and displays WebRTC stream for OBS Browser Source
 */

let socket;
let webrtcClient;
let streamId;
let config;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// DOM Elements
const remoteVideo = document.getElementById('remoteVideo');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');

// Get stream ID from URL
function getStreamId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('stream');
}

// Initialize
async function init() {
    streamId = getStreamId();

    if (!streamId) {
        showError('No stream ID provided. Add ?stream=<stream-id> to the URL');
        return;
    }

    console.log('Viewer initializing for stream:', streamId);

    // Load configuration
    try {
        const response = await fetch('/api/config');
        config = await response.json();
        console.log('Configuration loaded');
    } catch (err) {
        console.error('Failed to load config:', err);
        showError('Failed to connect to server');
        return;
    }

    // Connect to server
    connectToServer();
}

// Connect to signaling server
function connectToServer() {
    socket = io();

    socket.on('connect', () => {
        console.log('✅ Connected to signaling server');
        reconnectAttempts = 0;

        // Initialize WebRTC
        initWebRTC();

        // Register as viewer
        console.log('📝 Registering as viewer for stream:', streamId);
        socket.emit('register-viewer', { streamId });
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        handleDisconnect();
    });

    socket.on('registered', async (data) => {
        console.log('✅ Registered as viewer:', data);

        if (data.streamerSocketId) {
            // Streamer is available, create offer
            console.log('📤 Creating offer for streamer:', data.streamerSocketId);
            try {
                const offer = await webrtcClient.createOffer(data.streamerSocketId);
                socket.emit('offer', {
                    to: data.streamerSocketId,
                    offer: offer,
                    streamId: streamId
                });
                console.log('📤 Sent offer to streamer');
            } catch (error) {
                console.error('❌ Failed to create offer:', error);
                showError('Failed to create connection offer');
            }
        } else {
            console.log('⏳ Waiting for streamer...');
            showError('Streamer not found. Make sure streaming is active on mobile device.');
        }
    });

    socket.on('answer', async (data) => {
        console.log('📥 Received answer from streamer');
        try {
            await webrtcClient.handleAnswer(data.answer);
            console.log('✅ Answer processed');
        } catch (error) {
            console.error('❌ Failed to handle answer:', error);
        }
    });

    socket.on('ice-candidate', async (data) => {
        if (webrtcClient && data.candidate) {
            console.log('📥 Received ICE candidate');
            await webrtcClient.handleIceCandidate(data.candidate);
        }
    });

    socket.on('error', (data) => {
        console.error('❌ Server error:', data.message);
        showError(data.message);
    });
}

// Initialize WebRTC
function initWebRTC() {
    webrtcClient = new WebRTCClient({
        iceServers: config.webrtc.iceServers,
        onRemoteStream: handleRemoteStream,
        onConnectionStateChange: handleConnectionStateChange
    });

    webrtcClient.socket = socket;
    webrtcClient.initPeerConnection();
    webrtcClient.handleRemoteStream();
}

// Handle remote stream
function handleRemoteStream(stream) {
    console.log('📥 Received remote stream');
    console.log('Tracks:', stream.getTracks().map(t => `${t.kind} (${t.readyState})`).join(', '));

    remoteVideo.srcObject = stream;

    // Hide loading, show video
    loading.style.display = 'none';
    error.style.display = 'none';
    remoteVideo.style.display = 'block';

    // For OBS: try unmuted first, then muted as fallback
    const playVideo = () => {
        // Try unmuted (for OBS)
        remoteVideo.muted = false;
        remoteVideo.play()
            .then(() => {
                console.log('✅ Video playing (unmuted)');
            })
            .catch(err => {
                console.log('⚠️ Unmuted autoplay blocked, trying muted...');
                // Fallback: muted (for browsers)
                remoteVideo.muted = true;
                return remoteVideo.play();
            })
            .then(() => {
                if (remoteVideo.muted) {
                    console.log('✅ Video playing (muted)');
                }
            })
            .catch(err2 => {
                console.error('❌ Failed to play video:', err2);
            });
    };

    // Small delay to ensure stream is ready
    setTimeout(playVideo, 100);
}

// Handle connection state changes
function handleConnectionStateChange(state) {
    console.log('Connection state:', state);

    if (state === 'connected') {
        console.log('WebRTC connection established');
        reconnectAttempts = 0;
    } else if (state === 'disconnected' || state === 'failed') {
        console.log('WebRTC connection lost');
        handleDisconnect();
    }
}

// Handle disconnect
function handleDisconnect() {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

        loading.style.display = 'block';
        loading.querySelector('div:last-child').textContent = `Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`;

        // Cleanup
        if (webrtcClient) {
            webrtcClient.close();
            webrtcClient = null;
        }

        // Reconnect after delay
        setTimeout(() => {
            if (socket) {
                socket.connect();
            } else {
                connectToServer();
            }
        }, 2000 * reconnectAttempts);
    } else {
        showError('Connection lost. Please refresh the page.');
    }
}

// Show error
function showError(message) {
    console.error('Error:', message);
    loading.style.display = 'none';
    error.style.display = 'block';
    errorMessage.textContent = message;
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Auto-reconnect on visibility change (when OBS scene becomes active)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (!webrtcClient || webrtcClient.peerConnection?.connectionState !== 'connected')) {
        console.log('Page became visible, checking connection...');
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            handleDisconnect();
        }
    }
});
