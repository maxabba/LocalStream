const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const Bonjour = require('bonjour-service');
const QRCode = require('qrcode');
const path = require('path');
const os = require('os');
const config = require('./config.json');

const app = express();

// Try to create HTTPS server with self-signed certificates
let httpsServer;
let useHttps = false;

try {
    const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'localhost-cert.pem'))
    };
    httpsServer = https.createServer(httpsOptions, app);
    useHttps = true;
    console.log('✅ HTTPS certificates found - iOS/Safari support enabled');
} catch (error) {
    console.log('⚠️  HTTPS certificates not found - using HTTP only');
    console.log('   iOS/Safari will not work over network. Run: npm run generate-cert');
}

// Always create HTTP server for local access
const httpServer = http.createServer(app);

// Create Socket.IO instance that works on both servers
let io;
if (useHttps) {
    // Attach Socket.IO to both HTTP and HTTPS servers
    io = new Server({
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
    io.attach(httpsServer);
    io.attach(httpServer);
} else {
    // HTTP only mode
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Store active streams and connections
const streams = new Map();
const rooms = new Map();

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();
const httpPort = config.server.port;
const httpsPort = config.server.httpsPort || 3443;

const httpURL = `http://${localIP}:${httpPort}`;
const httpsURL = `https://${localIP}:${httpsPort}`;
const serverURL = useHttps ? httpsURL : httpURL;

console.log('\n🚀 LocalStream Server Starting...\n');

if (useHttps) {
    console.log('🔒 HTTPS Mode (iOS/Safari Compatible)');
    console.log(`📱 Mobile Streamer: ${httpsURL}/mobile`);
    console.log(`💻 Desktop Control: ${httpsURL}/desktop`);
    console.log(`🎥 OBS Viewer: ${httpsURL}/viewer?stream=<stream-id>`);
    console.log(`\n📝 Note: Accept the security warning on first visit\n`);
} else {
    console.log('⚠️  HTTP Mode (Desktop only - iOS will not work)');
    console.log(`📱 Mobile Streamer: ${httpURL}/mobile`);
    console.log(`💻 Desktop Control: ${httpURL}/desktop`);
    console.log(`🎥 OBS Viewer: ${httpURL}/viewer?stream=<stream-id>`);
    console.log(`\n⚠️  To enable iOS support, run: npm run generate-cert\n`);
}

// Bonjour/mDNS service for auto-discovery
let bonjourService;
if (config.discovery.enabled) {
    const bonjour = new Bonjour.Bonjour();
    bonjourService = bonjour.publish({
        name: config.discovery.serviceName,
        type: config.discovery.serviceType,
        port: config.server.port,
        txt: {
            path: '/',
            version: '1.0.0'
        }
    });
    console.log(`🔍 mDNS Service Published: ${config.discovery.serviceName}\n`);
}

// REST API Endpoints

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        streams: streams.size,
        uptime: process.uptime()
    });
});

// Get configuration
app.get('/api/config', (req, res) => {
    res.json({
        webrtc: config.webrtc,
        video: config.video,
        serverURL
    });
});

// Get active streams
app.get('/api/streams', (req, res) => {
    const streamList = Array.from(streams.values()).map(stream => ({
        id: stream.id,
        name: stream.name,
        status: stream.status,
        viewers: stream.viewers,
        createdAt: stream.createdAt,
        stats: stream.stats
    }));
    res.json(streamList);
});

// Generate QR code for mobile access
app.get('/api/qr/mobile', async (req, res) => {
    try {
        const url = `${serverURL}/mobile`;
        const qr = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        res.json({ qr, url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebRTC Signaling via Socket.IO
io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Register as streamer
    socket.on('register-streamer', (data) => {
        const streamId = data.streamId || `stream-${Date.now()}`;
        const stream = {
            id: streamId,
            name: data.name || `Camera ${streams.size + 1}`,
            socketId: socket.id,
            status: 'active',
            viewers: 0,
            createdAt: new Date().toISOString(),
            stats: {
                bitrate: 0,
                fps: 0,
                resolution: data.resolution || 'unknown'
            }
        };

        streams.set(streamId, stream);
        socket.streamId = streamId;
        socket.role = 'streamer';

        console.log(`📹 Streamer registered: ${stream.name} (${streamId})`);

        // Use HTTP URL for better OBS compatibility
        socket.emit('registered', {
            streamId,
            viewerURL: `${httpURL}/viewer?stream=${streamId}`
        });

        // Notify all clients about new stream
        io.emit('streams-updated', Array.from(streams.values()));
    });

    // Register as viewer
    socket.on('register-viewer', (data) => {
        const { streamId } = data;
        socket.streamId = streamId;
        socket.role = 'viewer';

        if (streams.has(streamId)) {
            const stream = streams.get(streamId);
            stream.viewers++;

            console.log(`👁️  Viewer connected to: ${stream.name} (${streamId})`);

            // Get streamer socket
            const streamerSocket = Array.from(io.sockets.sockets.values())
                .find(s => s.streamId === streamId && s.role === 'streamer');

            if (streamerSocket) {
                socket.emit('registered', { streamId, streamerSocketId: streamerSocket.id });
            } else {
                socket.emit('error', { message: 'Streamer not found' });
            }

            io.emit('streams-updated', Array.from(streams.values()));
        } else {
            socket.emit('error', { message: 'Stream not found' });
        }
    });

    // WebRTC Signaling: Offer
    socket.on('offer', (data) => {
        const { to, offer, streamId } = data;
        console.log(`📤 Forwarding offer from ${socket.id} to ${to}`);
        io.to(to).emit('offer', {
            from: socket.id,
            offer,
            streamId
        });
    });

    // WebRTC Signaling: Answer
    socket.on('answer', (data) => {
        const { to, answer } = data;
        console.log(`📤 Forwarding answer from ${socket.id} to ${to}`);
        io.to(to).emit('answer', {
            from: socket.id,
            answer
        });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('ice-candidate', (data) => {
        const { to, candidate } = data;
        io.to(to).emit('ice-candidate', {
            from: socket.id,
            candidate
        });
    });

    // Update stream stats
    socket.on('stats-update', (data) => {
        if (socket.streamId && streams.has(socket.streamId)) {
            const stream = streams.get(socket.streamId);
            stream.stats = { ...stream.stats, ...data };
            io.emit('streams-updated', Array.from(streams.values()));
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);

        if (socket.streamId) {
            const stream = streams.get(socket.streamId);

            if (socket.role === 'streamer') {
                console.log(`📹 Streamer disconnected: ${stream?.name}`);
                streams.delete(socket.streamId);
            } else if (socket.role === 'viewer' && stream) {
                stream.viewers = Math.max(0, stream.viewers - 1);
            }

            io.emit('streams-updated', Array.from(streams.values()));
        }
    });
});

// Start servers
if (useHttps) {
    // Start HTTPS server (main server for iOS)
    httpsServer.listen(httpsPort, config.server.host, () => {
        console.log(`✨ HTTPS Server running on port ${httpsPort}`);
        console.log(`🌐 Access from network: ${httpsURL}\n`);
    });

    // Also start HTTP server for redirects and compatibility
    httpServer.listen(httpPort, config.server.host, () => {
        console.log(`📡 HTTP Server running on port ${httpPort} (redirects to HTTPS)`);
    });
} else {
    // HTTP only mode
    httpServer.listen(httpPort, config.server.host, () => {
        console.log(`✨ HTTP Server running on port ${httpPort}`);
        console.log(`🌐 Access from network: ${httpURL}\n`);
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (bonjourService) {
        bonjourService.stop();
    }

    const closeServers = [];
    if (useHttps && httpsServer) {
        closeServers.push(new Promise(resolve => httpsServer.close(resolve)));
    }
    if (httpServer) {
        closeServers.push(new Promise(resolve => httpServer.close(resolve)));
    }

    Promise.all(closeServers).then(() => {
        console.log('👋 Servers closed');
        process.exit(0);
    });
});
