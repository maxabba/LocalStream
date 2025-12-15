// Preload script for security isolation
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Server control
    startServer: () => ipcRenderer.invoke('start-server'),
    stopServer: () => ipcRenderer.invoke('stop-server'),
    getStatus: () => ipcRenderer.invoke('get-status'),

    // External links
    openURL: (url) => ipcRenderer.invoke('open-url', url),

    // QR Code generation
    generateQRCode: (text) => ipcRenderer.invoke('generate-qr', text),

    // Updates
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

    // Event listeners
    onServerStatus: (callback) => {
        ipcRenderer.on('server-status', (_event, data) => callback(data));
    },
    onServerLog: (callback) => {
        ipcRenderer.on('server-log', (_event, message) => callback(message));
    }
});
