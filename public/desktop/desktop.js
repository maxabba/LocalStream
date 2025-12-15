/**
 * Desktop Control Application
 * Manages and monitors active streams
 */

let socket;
let streams = [];
let config;

// DOM Elements
const serverUrl = document.getElementById('serverUrl');
const mobileUrl = document.getElementById('mobileUrl');
const streamCount = document.getElementById('streamCount');
const streamsContainer = document.getElementById('streamsContainer');
const showQrBtn = document.getElementById('showQrBtn');
const qrModal = document.getElementById('qrModal');
const closeQrModal = document.getElementById('closeQrModal');
const qrCode = document.getElementById('qrCode');
const qrUrl = document.getElementById('qrUrl');

// Initialize
async function init() {
  // Load configuration
  try {
    const response = await fetch('/api/config');
    config = await response.json();

    // Update server info
    serverUrl.textContent = config.serverURL;
    mobileUrl.textContent = `${config.serverURL}/mobile`;

    console.log('Configuration loaded:', config);
  } catch (error) {
    console.error('Failed to load config:', error);
    showToast('Failed to connect to server', 'error');
    return;
  }

  // Connect to server
  connectToServer();

  // Event listeners
  showQrBtn.addEventListener('click', showQrCode);
  closeQrModal.addEventListener('click', hideQrCode);
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) hideQrCode();
  });

  // Load initial streams
  loadStreams();

  // Poll for streams every 5 seconds as backup
  setInterval(() => {
    loadStreams();
  }, 5000);
}

// Connect to signaling server
function connectToServer() {
  socket = io();

  socket.on('connect', () => {
    console.log('✅ Connected to server, socket ID:', socket.id);
    if (typeof showToast === 'function') {
      showToast('Connected to server', 'success');
    }
    // Load streams immediately on connect
    loadStreams();
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
    if (typeof showToast === 'function') {
      showToast('Disconnected from server', 'warning');
    }
  });

  socket.on('streams-updated', (updatedStreams) => {
    console.log('📡 Streams updated via Socket.IO:', updatedStreams);
    streams = updatedStreams;
    renderStreams();
  });

  socket.on('bandwidth-status', (data) => {
    console.log('📊 Bandwidth status:', data);
    updateBandwidthMonitor(data);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });
}

// Load streams from API
async function loadStreams() {
  try {
    console.log('📥 Loading streams from API...');
    const response = await fetch('/api/streams');
    const data = await response.json();
    console.log('📥 Received streams:', data);
    streams = data;
    renderStreams();
  } catch (error) {
    console.error('❌ Failed to load streams:', error);
  }
}

// Render streams
function renderStreams() {
  console.log('🎨 Rendering streams:', streams.length, 'stream(s)');
  streamCount.textContent = `${streams.length} stream${streams.length !== 1 ? 's' : ''}`;

  if (streams.length === 0) {
    streamsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📱</div>
        <h3>No Active Streams</h3>
        <p>Start streaming from a mobile device to see it here</p>
      </div>
    `;
    return;
  }

  console.log('Creating stream cards for:', streams.map(s => s.name));
  streamsContainer.innerHTML = streams.map(stream => createStreamCard(stream)).join('');

  // Add event listeners to copy buttons
  streams.forEach(stream => {
    const copyBtn = document.getElementById(`copy-${stream.id}`);
    if (copyBtn) {
      copyBtn.addEventListener('click', () => copyStreamUrl(stream.id));
    }
  });
}

// Create stream card HTML
function createStreamCard(stream) {
  // Use HTTP URL for OBS compatibility (HTTPS has issues with Browser Source)
  const serverUrl = config.serverURL.replace('https:', 'http:').replace(':3443', ':3000');
  const viewerURL = `${serverUrl}/viewer?stream=${stream.id}`;
  const resolution = stream.stats?.resolution || 'Unknown';
  const fps = stream.stats?.fps || 0;
  const bitrate = stream.stats?.bitrate || 0;
  const viewers = stream.viewers || 0;

  return `
    <div class="stream-card" data-stream-id="${stream.id}">
      <div class="stream-preview">
        <div class="stream-placeholder" style="background: linear-gradient(135deg, #1a1f2e 0%, #2a3040 100%); display: flex; align-items: center; justify-content: center; height: 100%;">
          <span style="font-size: 48px; opacity: 0.5;">📹</span>
        </div>
        <div class="stream-status">
          <span>LIVE</span>
        </div>
      </div>
      
      <div class="stream-info-card">
        <h3 class="stream-name">${escapeHtml(stream.name)}</h3>
        
        <div class="stream-stats">
          <div class="stat-item">
            <span class="stat-label">Resolution</span>
            <span class="stat-value">${resolution}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">FPS</span>
            <span class="stat-value">${fps} fps</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Bitrate</span>
            <span class="stat-value">${formatBitrate(bitrate)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Viewers</span>
            <span class="stat-value">${viewers}</span>
          </div>
        </div>
        
        <div class="stream-url">
          <label>OBS Browser Source URL:</label>
          <div class="url-copy-group">
            <input type="text" class="url-input" value="${viewerURL}" readonly>
            <button id="copy-${stream.id}" class="btn-copy">📋 Copy</button>
          </div>
        </div>
        
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 10px;">
          Started: ${new Date(stream.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  `;
}

// Copy stream URL
async function copyStreamUrl(streamId) {
  const stream = streams.find(s => s.id === streamId);
  if (!stream) return;

  // Use HTTP URL for OBS compatibility
  const serverUrl = config.serverURL.replace('https:', 'http:').replace(':3443', ':3000');
  const viewerURL = `${serverUrl}/viewer?stream=${streamId}`;
  const success = await copyToClipboard(viewerURL);

  if (success) {
    showToast('URL copied to clipboard!', 'success');

    const btn = document.getElementById(`copy-${streamId}`);
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied';
      btn.style.background = 'var(--success)';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 2000);
    }
  } else {
    showToast('Failed to copy URL', 'error');
  }
}

// Show QR code modal
async function showQrCode() {
  try {
    const response = await fetch('/api/qr/mobile');
    const data = await response.json();

    qrCode.innerHTML = `<img src="${data.qr}" alt="QR Code">`;
    qrUrl.textContent = data.url;
    qrModal.classList.add('active');
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    showToast('Failed to generate QR code', 'error');
  }
}

// Hide QR code modal
function hideQrCode() {
  qrModal.classList.remove('active');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Update bandwidth monitor UI
function updateBandwidthMonitor(data) {
  const totalBandwidthEl = document.getElementById('totalBandwidth');
  const usedBandwidthEl = document.getElementById('usedBandwidth');
  const availableBandwidthEl = document.getElementById('availableBandwidth');

  if (totalBandwidthEl) {
    totalBandwidthEl.textContent = `${data.totalBandwidth.toFixed(1)} Mbps`;
  }
  if (usedBandwidthEl) {
    usedBandwidthEl.textContent = `${data.usedBandwidth.toFixed(1)} Mbps`;
  }
  if (availableBandwidthEl) {
    availableBandwidthEl.textContent = `${data.availableBandwidth.toFixed(1)} Mbps`;
  }
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
