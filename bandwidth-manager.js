/**
 * BandwidthManager
 *
 * Gestisce l'allocazione dinamica della banda tra streamer multipli.
 * Implementa divisione equa della banda con rispetto dei limiti tier.
 */

const fs = require('fs');
const path = require('path');

class BandwidthManager {
    constructor() {
        this.totalAvailableBandwidth = 0; // Mbps totali disponibili
        this.activeStreamers = new Map(); // streamerId -> { quality, socketId, allocatedBitrate }
        this.qualityTiers = this.loadQualityTiers();

        console.log('🎛️  BandwidthManager initialized');
        console.log('📊 Quality tiers loaded:', Object.keys(this.qualityTiers));
    }

    /**
     * Carica i tier di qualità da config.json
     */
    loadQualityTiers() {
        try {
            const configPath = path.join(__dirname, 'config.json');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config.video.presets || {};
        } catch (error) {
            console.error('❌ Failed to load quality tiers:', error);
            return {};
        }
    }

    /**
     * Imposta la banda totale disponibile (in Mbps)
     * @param {number} bandwidth - Banda totale in Mbps
     */
    setTotalBandwidth(bandwidth) {
        this.totalAvailableBandwidth = bandwidth;
        console.log(`📡 Total available bandwidth set to: ${bandwidth.toFixed(2)} Mbps`);
    }

    /**
     * Calcola l'allocazione equa della banda tra tutti gli streamer attivi
     * @returns {Map<string, number>} streamerId -> bitrate allocato (bps)
     */
    calculateAllocation() {
        const allocations = new Map();
        const activeCount = this.activeStreamers.size;

        if (activeCount === 0) {
            return allocations;
        }

        // Divisione equa in Mbps
        const fairShareMbps = this.totalAvailableBandwidth / activeCount;

        for (const [streamerId, streamerInfo] of this.activeStreamers) {
            const tier = this.qualityTiers[streamerInfo.quality];

            if (!tier) {
                console.warn(`⚠️  Unknown quality tier: ${streamerInfo.quality}`);
                continue;
            }

            // Calcola bitrate allocato: minimo tra tier max e fair share
            const tierMaxMbps = tier.bitrateMax / 1_000_000;
            const allocatedMbps = Math.min(tierMaxMbps, fairShareMbps);
            const allocatedBps = allocatedMbps * 1_000_000;

            allocations.set(streamerId, allocatedBps);

            console.log(`📊 Streamer ${streamerId} (${streamerInfo.quality}): ${allocatedMbps.toFixed(2)} Mbps`);
        }

        return allocations;
    }

    /**
     * Verifica se un nuovo streamer può essere accettato
     * @param {string} quality - Tier di qualità richiesto (es. '1080p30')
     * @param {string} streamId - ID dello stream (per logging)
     * @returns {Object} { allowed: boolean, allocatedBitrate: number, required: number, available: number }
     */
    canAcceptNewStreamer(quality, streamId = 'unknown') {
        const tier = this.qualityTiers[quality];

        if (!tier) {
            console.error(`❌ Invalid quality tier: ${quality}`);
            return {
                allowed: false,
                allocatedBitrate: 0,
                required: 0,
                available: 0,
                message: `Tier di qualità '${quality}' non valido`
            };
        }

        // Calcola banda disponibile considerando il nuovo streamer
        const futureStreamerCount = this.activeStreamers.size + 1;
        const fairShareMbps = this.totalAvailableBandwidth / futureStreamerCount;
        const fairShareBps = fairShareMbps * 1_000_000;

        // Verifica allocazione per il nuovo streamer
        const tierMinBps = tier.bitrateMin;
        const tierMaxBps = tier.bitrateMax;
        const allocatedBps = Math.min(tierMaxBps, fairShareBps);

        console.log(`\n🔍 Checking new streamer (${quality}):`);
        console.log(`   Total bandwidth: ${this.totalAvailableBandwidth.toFixed(2)} Mbps`);
        console.log(`   Active streamers: ${this.activeStreamers.size}`);
        console.log(`   Fair share: ${fairShareMbps.toFixed(2)} Mbps`);
        console.log(`   Tier min: ${(tierMinBps / 1_000_000).toFixed(2)} Mbps`);
        console.log(`   Allocated: ${(allocatedBps / 1_000_000).toFixed(2)} Mbps`);

        // Verifica se allocazione soddisfa il minimo richiesto
        if (allocatedBps < tierMinBps) {
            const requiredMbps = tierMinBps / 1_000_000;
            const availableMbps = fairShareMbps;

            console.log(`❌ Insufficient bandwidth for ${quality}`);
            console.log(`   Required: ${requiredMbps.toFixed(2)} Mbps`);
            console.log(`   Available: ${availableMbps.toFixed(2)} Mbps`);

            return {
                allowed: false,
                allocatedBitrate: 0,
                required: requiredMbps,
                available: availableMbps,
                message: `Banda insufficiente: richiesti ${requiredMbps.toFixed(1)} Mbps, disponibili ${availableMbps.toFixed(1)} Mbps`
            };
        }

        console.log(`✅ New streamer accepted with ${(allocatedBps / 1_000_000).toFixed(2)} Mbps\n`);

        return {
            allowed: true,
            allocatedBitrate: allocatedBps,
            required: tierMinBps / 1_000_000,
            available: fairShareMbps,
            message: 'OK'
        };
    }

    /**
     * Aggiunge un nuovo streamer e ricalcola l'allocazione
     * @param {string} streamId - ID univoco dello stream
     * @param {string} quality - Tier di qualità (es. '1080p30')
     * @param {string} socketId - Socket.IO ID
     * @returns {Map<string, number>} Nuove allocazioni per tutti gli streamer
     */
    addStreamer(streamId, quality, socketId) {
        this.activeStreamers.set(streamId, {
            quality,
            socketId,
            allocatedBitrate: 0 // Verrà calcolato in reallocateBandwidth
        });

        console.log(`➕ Added streamer: ${streamId} (${quality})`);
        return this.reallocateBandwidth();
    }

    /**
     * Rimuove uno streamer e ricalcola l'allocazione
     * @param {string} streamId - ID dello stream da rimuovere
     * @returns {Map<string, number>} Nuove allocazioni per gli streamer rimanenti
     */
    removeStreamer(streamId) {
        if (this.activeStreamers.has(streamId)) {
            const streamerInfo = this.activeStreamers.get(streamId);
            this.activeStreamers.delete(streamId);
            console.log(`➖ Removed streamer: ${streamId} (${streamerInfo.quality})`);
        }

        return this.reallocateBandwidth();
    }

    /**
     * Ricalcola e applica l'allocazione banda a tutti gli streamer attivi
     * @returns {Map<string, number>} streamerId -> nuovo bitrate allocato (bps)
     */
    reallocateBandwidth() {
        console.log(`\n🔄 Reallocating bandwidth for ${this.activeStreamers.size} active streamers...`);

        const allocations = this.calculateAllocation();

        // Aggiorna le allocazioni interne
        for (const [streamId, allocatedBitrate] of allocations) {
            const streamerInfo = this.activeStreamers.get(streamId);
            if (streamerInfo) {
                streamerInfo.allocatedBitrate = allocatedBitrate;
            }
        }

        console.log(`✅ Reallocation complete\n`);
        return allocations;
    }

    /**
     * Ottiene il socket ID di uno streamer
     * @param {string} streamId - ID dello stream
     * @returns {string|null} Socket ID o null se non trovato
     */
    getStreamerSocketId(streamId) {
        const streamerInfo = this.activeStreamers.get(streamId);
        return streamerInfo ? streamerInfo.socketId : null;
    }

    /**
     * Ottiene lo stato corrente della banda
     * @returns {Object} Stato dettagliato
     */
    getStatus() {
        let usedBandwidthBps = 0;
        const streamers = [];

        for (const [streamId, info] of this.activeStreamers) {
            usedBandwidthBps += info.allocatedBitrate;
            streamers.push({
                id: streamId,
                quality: info.quality,
                bitrate: info.allocatedBitrate
            });
        }

        const usedBandwidthMbps = usedBandwidthBps / 1_000_000;
        const availableBandwidthMbps = Math.max(0, this.totalAvailableBandwidth - usedBandwidthMbps);

        return {
            totalBandwidth: this.totalAvailableBandwidth,
            usedBandwidth: usedBandwidthMbps,
            availableBandwidth: availableBandwidthMbps,
            activeStreamers: this.activeStreamers.size,
            streamers
        };
    }

    /**
     * Reset completo del manager
     */
    reset() {
        this.totalAvailableBandwidth = 0;
        this.activeStreamers.clear();
        console.log('🔄 BandwidthManager reset');
    }
}

module.exports = BandwidthManager;
