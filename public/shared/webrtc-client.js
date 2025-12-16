/**
 * WebRTC Client Library
 * Shared utilities for WebRTC peer connections
 */

class WebRTCClient {
    constructor(config = {}) {
        this.config = config;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.socket = null;
        this.iceServers = config.iceServers || [];
        this.maxBitrate = config.maxBitrate || 6000000; // ✅ NEW: Dynamic bitrate
        this.serverTargetBitrate = null; // Server-commanded target bitrate
        this.onRemoteStream = config.onRemoteStream || (() => { });
        this.onConnectionStateChange = config.onConnectionStateChange || (() => { });
        this.onStats = config.onStats || (() => { });
        this.statsInterval = null;
    }

    /**
     * Initialize peer connection
     */
    initPeerConnection() {
        const configuration = {
            iceServers: this.iceServers,
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // ICE candidate handling
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.socket) {
                // Prefer host candidates for LAN (filter out relay/srflx if direct is available)
                const candidate = event.candidate;
                if (candidate.type === 'host' ||
                    candidate.address?.startsWith('192.168.') ||
                    candidate.address?.startsWith('10.') ||
                    candidate.address?.startsWith('172.')) {

                    this.socket.emit('ice-candidate', {
                        to: this.remotePeerId,
                        candidate: event.candidate
                    });
                }
            }
        };

        // Connection state monitoring
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('Connection state:', state);
            this.onConnectionStateChange(state);

            if (state === 'connected') {
                this.startStatsMonitoring();
                this.optimizeForLAN(); // ✅ Apply LAN optimizations
            } else if (state === 'disconnected' || state === 'failed') {
                this.stopStatsMonitoring();
            }
        };

        // ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };

        return this.peerConnection;
    }

    /**
     * ✅ Apply LAN Optimizations: H.264, Bitrate Cap, Buffer + Quick Ramp-Up
     */
    async optimizeForLAN() {
        console.log('🚀 Applying LAN optimizations...');

        // 1. Buffer configuration for Receiver
        this.peerConnection.getReceivers().forEach(receiver => {
            if (receiver.track.kind === 'video') {
                if (receiver.playoutDelayHint !== undefined) {
                    receiver.playoutDelayHint = 0.1; // 100ms buffer for smooth playback
                    console.log('✅ Receiver buffer set to 100ms');
                }
            }
        });

        // 2. Bitrate and Priority configuration for Sender
        const senderPromises = [];
        this.peerConnection.getSenders().forEach(async sender => {
            if (sender.track && sender.track.kind === 'video') {
                const promise = (async () => {
                    try {
                        const params = sender.getParameters();
                        if (!params.encodings) params.encodings = [{}];

                        // Use serverTargetBitrate if available, otherwise maxBitrate
                        const targetBitrate = this.serverTargetBitrate || this.maxBitrate;
                        params.encodings[0].maxBitrate = targetBitrate;

                        // Priority
                        params.encodings[0].networkPriority = 'high';

                        if ('priority' in sender) {
                            sender.priority = 'high';
                        }

                        await sender.setParameters(params);
                        console.log(`✅ Sender bitrate set to ${targetBitrate / 1000000} Mbps, Priority High`);
                    } catch (err) {
                        console.warn('⚠️ Failed to set sender parameters:', err);
                    }
                })();
                senderPromises.push(promise);
            }
        });

        // Wait for all sender configurations to complete
        await Promise.all(senderPromises);

        // 3. Quick ramp-up if we have a server target bitrate
        if (this.serverTargetBitrate && this.localStream) {
            console.log(`🎯 Server target bitrate detected: ${(this.serverTargetBitrate / 1000000).toFixed(2)} Mbps`);
            await this.forceInitialBitrate(this.serverTargetBitrate);
        }
    }

    /**
     * Add local stream to peer connection
     */
    addLocalStream(stream) {
        this.localStream = stream;
        stream.getTracks().forEach(track => {
            // ✅ Content Hint Optimization
            if (track.kind === 'video' && 'contentHint' in track) {
                track.contentHint = 'motion';
            }
            this.peerConnection.addTrack(track, stream);
        });

        // Try to set Codec Preferences early (before offer)
        this.setPreferredCodec();
    }

    /**
     * Set Preferred Codec (H.264)
     */
    setPreferredCodec() {
        const transceivers = this.peerConnection.getTransceivers();
        transceivers.forEach(transceiver => {
            if (transceiver.sender.track && transceiver.sender.track.kind === 'video') {
                if ('setCodecPreferences' in transceiver && RTCRtpSender.getCapabilities) {
                    const caps = RTCRtpSender.getCapabilities('video');
                    const h264 = caps.codecs.filter(c => c.mimeType === 'video/H264');

                    if (h264.length > 0) {
                        transceiver.setCodecPreferences(h264);
                        console.log('✅ Preferred codec set to H.264');
                    }
                }
            }
        });
    }

    /**
     * Handle remote stream
     */
    handleRemoteStream() {
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);

            if (!this.remoteStream) {
                this.remoteStream = new MediaStream();
            }

            this.remoteStream.addTrack(event.track);

            // Apply buffer hint immediately on track reception
            if (event.receiver && event.receiver.playoutDelayHint !== undefined) {
                event.receiver.playoutDelayHint = 0.1; // 100ms
            }

            this.onRemoteStream(this.remoteStream);
        };
    }

    /**
     * Create and send offer
     */
    async createOffer(remotePeerId) {
        this.remotePeerId = remotePeerId;

        const offer = await this.peerConnection.createOffer({
            offerToReceiveAudio: false, // ✅ Disable audio
            offerToReceiveVideo: true
        });

        await this.peerConnection.setLocalDescription(offer);

        return offer;
    }

    /**
     * Create and send answer
     */
    async createAnswer() {
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }

    /**
     * Handle received offer
     */
    async handleOffer(offer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    }

    /**
     * Handle received answer
     */
    async handleAnswer(answer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    /**
     * Handle received ICE candidate
     */
    async handleIceCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    /**
     * Start monitoring WebRTC statistics
     */
    startStatsMonitoring() {
        this.stopStatsMonitoring();

        this.statsInterval = setInterval(async () => {
            if (!this.peerConnection) return;

            const stats = await this.peerConnection.getStats();
            const parsedStats = this.parseStats(stats);

            // ✅ ABR Conservativo Logic
            this.checkNetworkQuality(parsedStats);

            this.onStats(parsedStats);
        }, 2000); // ✅ Tuning: 2s interval (was 1s)
    }

    /**
     * ✅ Server-Aware Adaptive Bitrate (Hybrid ABR)
     * Adjusts bitrate based on packet loss with faster recovery towards server target
     */
    async checkNetworkQuality(stats) {
        // Only run if we are the sender (Streamer)
        if (!this.localStream) return;

        const packetLoss = parseFloat(stats.connection.packetLoss || 0);
        const now = Date.now();

        // Initialize state if needed
        if (!this.abrState) {
            // Use serverTargetBitrate as reference if available
            const targetBitrate = this.serverTargetBitrate || this.maxBitrate;

            this.abrState = {
                highLossStart: 0,
                lastRecovery: now,
                currentBitrateCap: targetBitrate,  // Start at target
                minBitrate: targetBitrate * 0.5,   // Floor at 50% of target
                targetBitrate: targetBitrate,      // Remember target for recovery
                serverTarget: this.serverTargetBitrate
            };
        }

        // 1. Detect Congestion (Packet Loss > 5%)
        if (packetLoss > 5) {
            if (this.abrState.highLossStart === 0) {
                this.abrState.highLossStart = now;
            } else if (now - this.abrState.highLossStart > 3000) {
                // Sustained loss for 3s -> Reduce Bitrate
                const newBitrate = Math.max(
                    this.abrState.currentBitrateCap * 0.85,
                    this.abrState.minBitrate
                );

                if (newBitrate < this.abrState.currentBitrateCap) {
                    console.warn(`📉 Network congestion! Reducing bitrate to ${(newBitrate / 1000000).toFixed(2)} Mbps`);
                    this.abrState.currentBitrateCap = newBitrate;
                    this.abrState.highLossStart = 0; // Reset timer
                    this.abrState.lastRecovery = now; // Reset recovery timer
                    await this.applyBitrateCap(newBitrate);
                }
            }
        } else {
            this.abrState.highLossStart = 0;

            // 2. Fast Recovery towards target (every 5s instead of 10s)
            const timeSinceRecovery = now - this.abrState.lastRecovery;
            const isUnderTarget = this.abrState.currentBitrateCap < this.abrState.targetBitrate;

            // Faster recovery: 5s interval, +20% increase (instead of 10s, +5%)
            if (timeSinceRecovery > 5000 && isUnderTarget) {
                const increaseRate = 0.20; // 20% increase
                const newBitrate = Math.min(
                    this.abrState.currentBitrateCap * (1 + increaseRate),
                    this.abrState.targetBitrate  // Ceiling at target, not beyond
                );

                console.log(`📈 Network stable. Increasing bitrate to ${(newBitrate / 1000000).toFixed(2)} Mbps (target: ${(this.abrState.targetBitrate / 1000000).toFixed(2)} Mbps)`);
                this.abrState.currentBitrateCap = newBitrate;
                this.abrState.lastRecovery = now;
                await this.applyBitrateCap(newBitrate);
            }
        }
    }

    /**
     * Helper to apply bitrate limit
     */
    async applyBitrateCap(bitrate) {
        this.peerConnection.getSenders().forEach(async sender => {
            if (sender.track && sender.track.kind === 'video') {
                try {
                    const params = sender.getParameters();
                    if (!params.encodings) params.encodings = [{}];
                    params.encodings[0].maxBitrate = Math.floor(bitrate);
                    await sender.setParameters(params);
                } catch (e) {
                    console.error('Failed to set bitrate:', e);
                }
            }
        });
    }

    /**
     * Force initial bitrate with quick ramp-up
     * Used at connection start to reach target quickly
     * @param {number} targetBitrate - Target bitrate in bps
     */
    async forceInitialBitrate(targetBitrate) {
        // Aggressive initial ramp-up in 3 steps
        const steps = [
            targetBitrate * 0.5,  // 50% immediately
            targetBitrate * 0.8,  // 80% after 500ms
            targetBitrate         // 100% after 1s
        ];

        console.log(`🚀 Quick ramp-up to ${(targetBitrate / 1000000).toFixed(2)} Mbps`);

        for (let i = 0; i < steps.length; i++) {
            await this.applyBitrateCap(steps[i]);
            console.log(`   Step ${i + 1}/3: ${(steps[i] / 1000000).toFixed(2)} Mbps`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`✅ Initial ramp-up complete: ${(targetBitrate / 1000000).toFixed(2)} Mbps`);
    }

    /**
     * Set target bitrate from server (gradual transition)
     * @param {number} targetBitrate - Target bitrate in bps
     */
    async setTargetBitrate(targetBitrate) {
        const currentBitrate = this.abrState?.currentBitrateCap || this.maxBitrate;
        const steps = 10;
        const stepSize = (targetBitrate - currentBitrate) / steps;

        console.log(`🎯 Adjusting bitrate: ${(currentBitrate / 1000000).toFixed(2)} → ${(targetBitrate / 1000000).toFixed(2)} Mbps`);

        // Gradual transition over 2 seconds (10 steps x 200ms)
        for (let i = 1; i <= steps; i++) {
            const newBitrate = currentBitrate + (stepSize * i);
            await this.applyBitrateCap(newBitrate);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        this.maxBitrate = targetBitrate;
        this.serverTargetBitrate = targetBitrate;

        // Update ABR state with new target
        if (this.abrState) {
            this.abrState.currentBitrateCap = targetBitrate;
            this.abrState.targetBitrate = targetBitrate;
            this.abrState.minBitrate = targetBitrate * 0.5;
            this.abrState.serverTarget = targetBitrate;
            this.abrState.lastRecovery = Date.now(); // Reset recovery timer
        }

        console.log(`✅ Bitrate adjusted to ${(targetBitrate / 1000000).toFixed(2)} Mbps`);
    }

    /**
     * Stop monitoring statistics
     */
    stopStatsMonitoring() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }

    /**
     * Parse WebRTC statistics
     */
    parseStats(stats) {
        const result = {
            video: {
                bitrate: 0, fps: 0, width: 0, height: 0,
                packetsLost: 0,
                framesDropped: 0,
                framesDecoded: 0,
                qualityLimitation: 'none'
            },
            audio: { bitrate: 0, packetsLost: 0 },
            connection: { rtt: 0, packetLoss: 0 }
        };

        stats.forEach(report => {
            // Inbound video stats
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
                result.video.packetsLost = report.packetsLost || 0;
                result.video.fps = report.framesPerSecond || 0;
                result.video.width = report.frameWidth || 0;
                result.video.height = report.frameHeight || 0;
                result.video.framesDropped = report.framesDropped || 0;
                result.video.framesDecoded = report.framesDecoded || 0;

                if (report.bytesReceived && this.lastBytesReceived) {
                    const bytesDiff = report.bytesReceived - this.lastBytesReceived;
                    result.video.bitrate = Math.round((bytesDiff * 8) / 1000); // kbps
                }
                this.lastBytesReceived = report.bytesReceived;
            }

            // Outbound video stats
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
                result.video.fps = report.framesPerSecond || 0;
                result.video.qualityLimitation = report.qualityLimitationReason || 'none';

                if (report.bytesSent && this.lastBytesSent) {
                    const bytesDiff = report.bytesSent - this.lastBytesSent;
                    result.video.bitrate = Math.round((bytesDiff * 8) / 1000); // kbps
                }
                this.lastBytesSent = report.bytesSent;
            }

            // Connection stats
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                result.connection.rtt = report.currentRoundTripTime * 1000 || 0; // ms
            }
        });

        // Calculate packet loss percentage
        const totalPackets = result.video.packetsLost + result.audio.packetsLost;
        if (totalPackets > 0) {
            result.connection.packetLoss = ((result.video.packetsLost + result.audio.packetsLost) / totalPackets * 100).toFixed(2);
        }

        return result;
    }

    /**
     * Close connection and cleanup
     */
    close() {
        this.stopStatsMonitoring();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.localStream = null;
        this.remoteStream = null;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCClient;
}
