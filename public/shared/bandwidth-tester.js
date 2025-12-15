/**
 * BandwidthTester
 *
 * Modulo client-side per testare la banda disponibile tra dispositivo e server.
 * Esegue test attivi inviando e ricevendo pacchetti reali via Socket.IO.
 */

class BandwidthTester {
    constructor() {
        this.chunkSize = 64 * 1024; // 64 KB per chunk
        this.uploadBytes = 0;
        this.downloadBytes = 0;
        this.testDuration = 5000; // 5 secondi default
        this.testActive = false;
    }

    /**
     * Esegue il test di banda upload + download
     * @param {Socket} socket - Socket.IO connection
     * @param {number} duration - Durata test in millisecondi (default: 5000ms)
     * @returns {Promise<Object>} { upload: Mbps, download: Mbps, total: Mbps }
     */
    async testBandwidth(socket, duration = 5000) {
        if (this.testActive) {
            throw new Error('Test già in corso');
        }

        this.testDuration = duration;
        this.uploadBytes = 0;
        this.downloadBytes = 0;
        this.testActive = true;

        console.log(`🧪 Starting bandwidth test (${duration}ms)...`);

        try {
            // Notifica il server dell'inizio del test
            socket.emit('bandwidth-test-start');

            // Esegui test upload e download in parallelo
            const startTime = Date.now();

            await Promise.all([
                this.testUpload(socket, startTime),
                this.testDownload(socket, startTime)
            ]);

            const actualDuration = Date.now() - startTime;

            // Calcola risultati
            const uploadMbps = this.calculateMbps(this.uploadBytes, actualDuration);
            const downloadMbps = this.calculateMbps(this.downloadBytes, actualDuration);
            const totalMbps = uploadMbps + downloadMbps;

            console.log(`✅ Bandwidth test complete:`);
            console.log(`   Upload: ${uploadMbps.toFixed(2)} Mbps (${this.formatBytes(this.uploadBytes)})`);
            console.log(`   Download: ${downloadMbps.toFixed(2)} Mbps (${this.formatBytes(this.downloadBytes)})`);
            console.log(`   Total: ${totalMbps.toFixed(2)} Mbps`);

            // Notifica il server del completamento
            socket.emit('bandwidth-test-complete', {
                uploadBytes: this.uploadBytes,
                downloadBytes: this.downloadBytes,
                duration: actualDuration
            });

            this.testActive = false;

            return {
                upload: uploadMbps,
                download: downloadMbps,
                total: totalMbps,
                duration: actualDuration
            };

        } catch (error) {
            console.error('❌ Bandwidth test failed:', error);
            this.testActive = false;
            throw error;
        }
    }

    /**
     * Test upload: invia chunk di dati al server
     * @param {Socket} socket - Socket.IO connection
     * @param {number} startTime - Timestamp inizio test
     */
    async testUpload(socket, startTime) {
        return new Promise((resolve) => {
            const sendChunk = () => {
                if (Date.now() - startTime >= this.testDuration) {
                    resolve();
                    return;
                }

                // Crea chunk binario casuale
                const chunk = new ArrayBuffer(this.chunkSize);
                const view = new Uint8Array(chunk);
                for (let i = 0; i < this.chunkSize; i++) {
                    view[i] = Math.floor(Math.random() * 256);
                }

                // Invia al server
                socket.emit('bandwidth-test-upload', {
                    chunk: chunk,
                    size: this.chunkSize
                });

                this.uploadBytes += this.chunkSize;

                // Invia prossimo chunk immediatamente (massima velocità)
                if (typeof setImmediate === 'function') {
                    setImmediate(sendChunk);
                } else {
                    setTimeout(sendChunk, 0);
                }
            };

            sendChunk();
        });
    }

    /**
     * Test download: riceve chunk di dati dal server
     * @param {Socket} socket - Socket.IO connection
     * @param {number} startTime - Timestamp inizio test
     */
    async testDownload(socket, startTime) {
        return new Promise((resolve) => {
            // Handler per chunk ricevuti
            const onDownloadChunk = (data) => {
                if (Date.now() - startTime >= this.testDuration) {
                    socket.off('bandwidth-test-download-chunk', onDownloadChunk);
                    resolve();
                    return;
                }

                this.downloadBytes += data.size || this.chunkSize;

                // Richiedi prossimo chunk immediatamente
                socket.emit('bandwidth-test-download-request');
            };

            // Registra listener
            socket.on('bandwidth-test-download-chunk', onDownloadChunk);

            // Avvia il download richiedendo il primo chunk
            socket.emit('bandwidth-test-download-request');

            // Timeout di sicurezza
            setTimeout(() => {
                socket.off('bandwidth-test-download-chunk', onDownloadChunk);
                resolve();
            }, this.testDuration + 1000);
        });
    }

    /**
     * Calcola Mbps da bytes e durata
     * @param {number} bytes - Bytes trasferiti
     * @param {number} durationMs - Durata in millisecondi
     * @returns {number} Mbps
     */
    calculateMbps(bytes, durationMs) {
        const bits = bytes * 8;
        const seconds = durationMs / 1000;
        const mbps = bits / seconds / 1_000_000;
        return mbps;
    }

    /**
     * Formatta bytes in formato leggibile
     * @param {number} bytes
     * @returns {string}
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Cancella un test in corso
     */
    cancel() {
        this.testActive = false;
        console.log('⚠️  Bandwidth test cancelled');
    }
}

// Esporta per uso in Node.js o browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BandwidthTester;
}
