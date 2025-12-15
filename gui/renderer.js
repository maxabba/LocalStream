// Renderer process - UI logic
// electronAPI is exposed by preload.js via contextBridge

// DOM Elements
const toggleServerBtn = document.getElementById('toggle-server');
const statusIndicator = document.getElementById('status-indicator');
const statusText = statusIndicator.querySelector('.status-text');
const localIPElement = document.getElementById('local-ip');
const httpPortElement = document.getElementById('http-port');
const httpsPortElement = document.getElementById('https-port');
const logsContainer = document.getElementById('logs');
const clearLogsBtn = document.getElementById('clear-logs');

// Quick action buttons
const btnMobile = document.getElementById('btn-mobile');
const btnDesktop = document.getElementById('btn-desktop');
const btnViewer = document.getElementById('btn-viewer');

// QR Modal elements
const qrModal = document.getElementById('qr-modal');
const closeQrModalBtn = document.getElementById('close-qr-modal');
const qrImage = document.getElementById('qr-image');
const qrUrlText = document.getElementById('qr-url-text');

// State
let isServerRunning = false;
let serverConfig = null;

// Initialize
loadInitialStatus();

// Server control button
toggleServerBtn.addEventListener('click', async () => {
    console.log('Start button clicked, isServerRunning:', isServerRunning);
    toggleServerBtn.disabled = true;

    if (!isServerRunning) {
        addLog('⏳ Starting server...', 'info');
        console.log('Calling electronAPI.startServer()...');

        try {
            const result = await window.electronAPI.startServer();
            console.log('Start server result:', result);

            if (result.success) {
                serverConfig = result.config;
                updateUIForRunningState();
            } else {
                addLog(`❌ Failed to start server: ${result.error || result.message}`, 'error');
                toggleServerBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error calling startServer:', error);
            addLog(`❌ Error: ${error.message}`, 'error');
            toggleServerBtn.disabled = false;
        }
    } else {
        addLog('⏳ Stopping server...', 'warning');

        try {
            const result = await window.electronAPI.stopServer();
            console.log('Stop server result:', result);

            if (result.success) {
                updateUIForStoppedState();
            } else {
                addLog(`❌ Failed to stop server: ${result.error || result.message}`, 'error');
                toggleServerBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error calling stopServer:', error);
            addLog(`❌ Error: ${error.message}`, 'error');
            toggleServerBtn.disabled = false;
        }
    }
});

// Quick action buttons
btnMobile.addEventListener('click', async () => {
    if (serverConfig) {
        const url = getServerURL() + '/mobile';

        // Show QR modal
        qrUrlText.textContent = url;
        qrModal.classList.add('active');

        try {
            const result = await window.electronAPI.generateQRCode(url);
            if (result.success) {
                qrImage.src = result.dataUrl;
                addLog(`📱 QR Code generated for Mobile Streamer`, 'info');
            } else {
                addLog(`❌ Failed to generate QR code: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
            addLog(`❌ Failed to generate QR code: ${error.message}`, 'error');
        }
    }
});

btnDesktop.addEventListener('click', () => {
    if (serverConfig) {
        const url = getServerURL() + '/desktop';
        window.electronAPI.openURL(url);
        addLog(`🌐 Opening Desktop Dashboard: ${url}`, 'info');
    }
});

btnViewer.addEventListener('click', () => {
    if (serverConfig) {
        const url = getServerURL() + '/viewer';
        window.electronAPI.openURL(url);
        addLog(`🌐 Opening OBS Viewer: ${url}`, 'info');
    }
});

// Clear logs button
clearLogsBtn.addEventListener('click', () => {
    logsContainer.innerHTML = '';
    addLog('Logs cleared', 'info');
});

// QR Modal close handlers
closeQrModalBtn.addEventListener('click', () => {
    qrModal.classList.remove('active');
});

// Close modal when clicking outside
qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
        qrModal.classList.remove('active');
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && qrModal.classList.contains('active')) {
        qrModal.classList.remove('active');
    }
});

// Listen for server status updates
window.electronAPI.onServerStatus((data) => {
    isServerRunning = data.status === 'running';
    serverConfig = data.config;

    if (data.status === 'running') {
        updateUIForRunningState();
    } else if (data.status === 'stopped') {
        updateUIForStoppedState();
    }
});

// Listen for server logs
window.electronAPI.onServerLog((message) => {
    addLog(message);
});

// Helper functions
function addLog(message, type = 'default') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;

    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;

    logsContainer.appendChild(logEntry);

    // Auto-scroll to bottom
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

function updateUIForRunningState() {
    isServerRunning = true;

    // Update button
    toggleServerBtn.innerHTML = '<span class="icon">■</span><span>Stop Server</span>';
    toggleServerBtn.classList.add('stop');
    toggleServerBtn.disabled = false;

    // Update status indicator
    statusIndicator.classList.add('running');
    statusText.textContent = 'Running';

    // Update server info
    if (serverConfig) {
        localIPElement.textContent = serverConfig.localIP || '-';
        httpPortElement.textContent = serverConfig.httpPort || '3000';
        httpsPortElement.textContent = serverConfig.httpsPort || '-';
    }

    // Enable quick action buttons
    btnMobile.disabled = false;
    btnDesktop.disabled = false;
    btnViewer.disabled = false;

    addLog('✅ Server started successfully', 'success');
}

function updateUIForStoppedState() {
    isServerRunning = false;
    serverConfig = null;

    // Update button
    toggleServerBtn.innerHTML = '<span class="icon">▶</span><span>Start Server</span>';
    toggleServerBtn.classList.remove('stop');
    toggleServerBtn.disabled = false;

    // Update status indicator
    statusIndicator.classList.remove('running');
    statusText.textContent = 'Stopped';

    // Reset server info
    httpsPortElement.textContent = '-';

    // Disable quick action buttons
    btnMobile.disabled = true;
    btnDesktop.disabled = true;
    btnViewer.disabled = true;

    addLog('🛑 Server stopped', 'warning');
}

function getServerURL() {
    if (!serverConfig) return '';

    const { localIP, httpsPort, httpPort } = serverConfig;

    // Prefer HTTPS if available
    if (httpsPort) {
        return `https://${localIP}:${httpsPort}`;
    }
    return `http://${localIP}:${httpPort}`;
}

async function loadInitialStatus() {
    try {
        const data = await window.electronAPI.getStatus();
        if (data) {
            isServerRunning = data.status === 'running';
            serverConfig = data.config;

            if (data.status === 'running') {
                updateUIForRunningState();
            }
        }
    } catch (error) {
        addLog(`⚠️ Failed to load initial status: ${error.message}`, 'warning');
    }
}

// Check for updates
checkForUpdates();

async function checkForUpdates() {
    try {
        const updateBanner = document.getElementById('update-banner');
        const updateVersion = document.getElementById('update-version');
        const btnUpdate = document.getElementById('btn-update');

        const result = await window.electronAPI.checkForUpdates();

        if (result.updateAvailable) {
            updateVersion.textContent = `v${result.version}`;
            updateBanner.classList.remove('hidden');

            btnUpdate.onclick = () => {
                window.electronAPI.openURL(result.url);
            };
            addLog(`🚀 Update available: v${result.version}`, 'info');
        }
    } catch (error) {
        console.error('Failed to check for updates:', error);
    }
}
