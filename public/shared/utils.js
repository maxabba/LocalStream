/**
 * Shared Utility Functions
 */

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format bitrate to human readable string
 */
function formatBitrate(kbps) {
    if (kbps < 1000) {
        return `${kbps.toFixed(0)} kbps`;
    }
    return `${(kbps / 1000).toFixed(2)} Mbps`;
}

/**
 * Format resolution
 */
function formatResolution(width, height) {
    if (!width || !height) return 'Unknown';

    const resolutions = {
        '3840x2160': '4K',
        '2560x1440': '1440p',
        '1920x1080': '1080p',
        '1280x720': '720p',
        '854x480': '480p',
        '640x360': '360p'
    };

    const key = `${width}x${height}`;
    return resolutions[key] || `${width}x${height}`;
}

/**
 * Format duration
 */
function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get quality indicator color based on metrics
 */
function getQualityColor(metric, type = 'latency') {
    if (type === 'latency') {
        if (metric < 50) return '#00ff88';
        if (metric < 100) return '#ffaa00';
        return '#ff4444';
    }

    if (type === 'packetLoss') {
        if (metric < 1) return '#00ff88';
        if (metric < 5) return '#ffaa00';
        return '#ff4444';
    }

    if (type === 'fps') {
        if (metric >= 55) return '#00ff88';
        if (metric >= 25) return '#ffaa00';
        return '#ff4444';
    }

    return '#888888';
}

/**
 * Detect device type
 */
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

/**
 * Detect browser
 */
function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('SamsungBrowser') > -1) return 'Samsung';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    if (ua.indexOf('Trident') > -1) return 'IE';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    return 'Unknown';
}

/**
 * Check WebRTC support
 */
function checkWebRTCSupport() {
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasRTCPeerConnection = !!(window.RTCPeerConnection);

    return {
        supported: hasGetUserMedia && hasRTCPeerConnection,
        getUserMedia: hasGetUserMedia,
        RTCPeerConnection: hasRTCPeerConnection,
        browser: getBrowser(),
        device: getDeviceType()
    };
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#4a9eff'};
    color: #000;
    border-radius: 10px;
    font-weight: 600;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Generate random ID
 */
function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatBytes,
        formatBitrate,
        formatResolution,
        formatDuration,
        getQualityColor,
        getDeviceType,
        getBrowser,
        checkWebRTCSupport,
        copyToClipboard,
        showToast,
        debounce,
        throttle,
        generateId
    };
}
