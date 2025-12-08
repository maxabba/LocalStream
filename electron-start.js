// Launcher script for Electron
const { spawn } = require('child_process');
const path = require('path');

// Get electron executable path
const electronPath = require('electron');

// Launch Electron with gui/main.js as the app
const child = spawn(electronPath, [path.join(__dirname, 'gui', 'main.js')], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '0' }
});

child.on('close', (code) => {
    process.exit(code);
});
