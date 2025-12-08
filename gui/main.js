// Electron main process
const path = require('path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const server = require('../server.js');
const QRCode = require('qrcode');

let mainWindow = null;
let serverRunning = false;
let serverConfig = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        title: 'LocalStream Server Control',
        autoHideMenuBar: true
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Send initial status
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('server-status', {
            running: serverRunning,
            config: serverConfig
        });
    });
}

// Logger function to send logs to GUI
function sendLog(message) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server-log', message);
    }
}

// IPC Handlers
ipcMain.handle('start-server', async () => {
    console.log('IPC: start-server called');
    if (serverRunning) {
        console.log('Server already running, returning false');
        return { success: false, message: 'Server already running' };
    }

    try {
        console.log('Calling server.startServer()...');
        serverConfig = await server.startServer(sendLog);
        console.log('Server started successfully, config:', serverConfig);
        serverRunning = true;

        mainWindow.webContents.send('server-status', {
            running: true,
            config: serverConfig
        });

        return { success: true, config: serverConfig };
    } catch (error) {
        console.error('Error starting server:', error);
        sendLog(`❌ Error starting server: ${error.message}`);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-server', async () => {
    if (!serverRunning) {
        return { success: false, message: 'Server not running' };
    }

    try {
        await server.stopServer();
        serverRunning = false;
        serverConfig = null;

        mainWindow.webContents.send('server-status', {
            running: false,
            config: null
        });

        return { success: true };
    } catch (error) {
        sendLog(`❌ Error stopping server: ${error.message}`);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-status', () => {
    return {
        running: serverRunning,
        config: serverConfig
    };
});

ipcMain.handle('open-url', (_event, url) => {
    shell.openExternal(url);
    return { success: true };
});

ipcMain.handle('generate-qr', async (_event, text) => {
    try {
        const dataUrl = await QRCode.toDataURL(text, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        return { success: true, dataUrl };
    } catch (error) {
        console.error('Error generating QR code:', error);
        return { success: false, error: error.message };
    }
});

// App lifecycle
app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// Cleanup on quit
app.on('before-quit', async (event) => {
    if (serverRunning) {
        event.preventDefault();
        await server.stopServer();
        serverRunning = false;
        app.exit();
    }
});
