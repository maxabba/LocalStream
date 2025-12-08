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

// Custom logger support for GUI integration
let customLogger = null;
function log(message) {
    console.log(message);
    if (customLogger) customLogger(message);
}

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
    log('✅ HTTPS certificates found - iOS/Safari support enabled');
} catch (error) {
    log('⚠️  HTTPS certificates not found - using HTTP only');
    log('   iOS/Safari will not work over network. Run: npm run generate-cert');
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
app.use(express.static(path.join(__dirname, 'public')));

// Serve specific pages for clean URLs
app.get('/desktop', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/desktop/index.html'));
});

app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/mobile/index.html'));
});

app.get('/viewer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/viewer/index.html'));
});

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

// Initial setup logs moved to startServer() function

// Bonjour/mDNS service for auto-discovery (initialized in startServer)
let bonjourService = null;

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
    log(`✅ Client connected: ${socket.id}`);

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

        log(`📹 Streamer registered: ${stream.name} (${streamId})`);

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

            log(`👁️  Viewer connected to: ${stream.name} (${streamId})`);

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
        log(`📤 Forwarding offer from ${socket.id} to ${to}`);
        io.to(to).emit('offer', {
            from: socket.id,
            offer,
            streamId
        });
    });

    // WebRTC Signaling: Answer
    socket.on('answer', (data) => {
        const { to, answer } = data;
        log(`📤 Forwarding answer from ${socket.id} to ${to}`);
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
        log(`❌ Client disconnected: ${socket.id}`);

        if (socket.streamId) {
            const stream = streams.get(socket.streamId);

            if (socket.role === 'streamer') {
                log(`📹 Streamer disconnected: ${stream?.name}`);
                streams.delete(socket.streamId);
            } else if (socket.role === 'viewer' && stream) {
                stream.viewers = Math.max(0, stream.viewers - 1);
            }

            io.emit('streams-updated', Array.from(streams.values()));
        }
    });
});

// Exported functions for programmatic control (Electron GUI)
let serverInstances = { http: null, https: null };

function startServer(logger) {
    if (logger) customLogger = logger;

    return new Promise((resolve, reject) => {
        try {
            log('\n🚀 LocalStream Server Starting...\n');

            if (useHttps) {
                log('🔒 HTTPS Mode (iOS/Safari Compatible)');
                log(`📱 Mobile Streamer: ${httpsURL}/mobile`);
                log(`💻 Desktop Control: ${httpsURL}/desktop`);
                log(`🎥 OBS Viewer: ${httpsURL}/viewer?stream=<stream-id>`);
                log(`\n📝 Note: Accept the security warning on first visit\n`);
            } else {
                log('⚠️  HTTP Mode (Desktop only - iOS will not work)');
                log(`📱 Mobile Streamer: ${httpURL}/mobile`);
                log(`💻 Desktop Control: ${httpURL}/desktop`);
                log(`🎥 OBS Viewer: ${httpURL}/viewer?stream=<stream-id>`);
                log(`\n⚠️  To enable iOS support, run: npm run generate-cert\n`);
            }

            const startPromises = [];

            if (useHttps) {
                startPromises.push(new Promise((res) => {
                    serverInstances.https = httpsServer.listen(httpsPort, config.server.host, () => {
                        log(`✨ HTTPS Server running on port ${httpsPort}`);
                        log(`🌐 Access from network: ${httpsURL}\n`);
                        res();
                    });
                }));

                startPromises.push(new Promise((res) => {
                    serverInstances.http = httpServer.listen(httpPort, config.server.host, () => {
                        log(`📡 HTTP Server running on port ${httpPort} (redirects to HTTPS)`);
                        res();
                    });
                }));
            } else {
                startPromises.push(new Promise((res) => {
                    serverInstances.http = httpServer.listen(httpPort, config.server.host, () => {
                        log(`✨ HTTP Server running on port ${httpPort}`);
                        log(`🌐 Access from network: ${httpURL}\n`);
                        res();
                    });
                }));
            }

            Promise.all(startPromises).then(() => {
                // Start Bonjour/mDNS service after servers are running
                if (config.discovery.enabled && !bonjourService) {
                    const bonjour = new Bonjour.Bonjour();
                    bonjourService = bonjour.publish({
                        name: config.discovery.serviceName,
                        type: config.discovery.serviceType,
                        port: httpPort,
                        txt: { path: '/', version: '1.0.0' }
                    });
                    log(`🔍 mDNS Service Published: ${config.discovery.serviceName}\n`);
                }

                resolve({ httpPort, httpsPort: useHttps ? httpsPort : null, localIP });
            });
        } catch (error) {
            reject(error);
        }
    });
}

function stopServer() {
    return new Promise((resolve) => {
        log('\n🛑 Shutting down server...');

        // Disconnect all Socket.IO clients
        if (io) {
            io.disconnectSockets();
            log('🔌 Disconnected all Socket.IO clients');
        }

        // Stop Bonjour service
        if (bonjourService) {
            bonjourService.stop();
            bonjourService = null;
            log('🔍 Stopped mDNS service');
        }

        // Close HTTP/HTTPS servers with timeout
        const closePromises = [];

        if (serverInstances.https) {
            closePromises.push(new Promise(res => {
                const timeout = setTimeout(() => {
                    log('⚠️ HTTPS server close timeout, forcing shutdown');
                    res();
                }, 2000);

                serverInstances.https.close(() => {
                    clearTimeout(timeout);
                    res();
                });
            }));
        }

        if (serverInstances.http) {
            closePromises.push(new Promise(res => {
                const timeout = setTimeout(() => {
                    log('⚠️ HTTP server close timeout, forcing shutdown');
                    res();
                }, 2000);

                serverInstances.http.close(() => {
                    clearTimeout(timeout);
                    res();
                });
            }));
        }

        Promise.all(closePromises).then(() => {
            log('👋 Servers closed');
            serverInstances = { http: null, https: null };
            resolve();
        });
    });
}

// CLI mode - only run if executed directly
if (require.main === module) {
    startServer(null);

    process.on('SIGINT', () => {
        stopServer().then(() => process.exit(0));
    });
}

// Export for programmatic use (Electron)
module.exports = { startServer, stopServer };
