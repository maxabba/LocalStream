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
                this.socket.emit('ice-candidate', {
                    to: this.remotePeerId,
                    candidate: event.candidate
                });
            }
        };

        // Connection state monitoring
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('Connection state:', state);
            this.onConnectionStateChange(state);

            if (state === 'connected') {
                this.startStatsMonitoring();
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
     * Add local stream to peer connection
     */
    addLocalStream(stream) {
        this.localStream = stream;
        stream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
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
            this.onRemoteStream(this.remoteStream);
        };
    }

    /**
     * Create and send offer
     */
    async createOffer(remotePeerId) {
        this.remotePeerId = remotePeerId;

        const offer = await this.peerConnection.createOffer({
            offerToReceiveAudio: true,
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
            this.onStats(parsedStats);
        }, 1000);
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
            video: { bitrate: 0, fps: 0, width: 0, height: 0, packetsLost: 0 },
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

                if (report.bytesReceived && this.lastBytesReceived) {
                    const bytesDiff = report.bytesReceived - this.lastBytesReceived;
                    result.video.bitrate = Math.round((bytesDiff * 8) / 1000); // kbps
                }
                this.lastBytesReceived = report.bytesReceived;
            }

            // Outbound video stats
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
                result.video.fps = report.framesPerSecond || 0;

                if (report.bytesSent && this.lastBytesSent) {
                    const bytesDiff = report.bytesSent - this.lastBytesSent;
                    result.video.bitrate = Math.round((bytesDiff * 8) / 1000); // kbps
                }
                this.lastBytesSent = report.bytesSent;
            }

            // Audio stats
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                result.audio.packetsLost = report.packetsLost || 0;
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
