// Process communication
process.on('uncaughtException', (error) => {
    if (process.connected) process.send({ type: 'error', error: error.message + (error.stack ? '\n' + error.stack : '') });
    process.exit(1);
});

let server;

try {
    server = require('../server.js');
} catch (error) {
    if (process.connected) process.send({ type: 'error', error: 'Failed to load server module: ' + error.message + '\n' + error.stack });
    process.exit(1);
}

// Process communication
process.on('message', async (msg) => {
    if (msg.command === 'start') {
        try {
            if (!server) throw new Error('Server module not loaded');

            // Forward logs to parent
            const config = await server.startServer((message) => {
                if (process.connected) process.send({ type: 'log', message });
            });

            if (process.connected) process.send({ type: 'started', config });
        } catch (error) {
            if (process.connected) process.send({ type: 'error', error: error.message });
        }
    } else if (msg.command === 'stop') {
        try {
            if (server) await server.stopServer();
            if (process.connected) process.send({ type: 'stopped' });
            process.exit(0);
        } catch (error) {
            if (process.connected) process.send({ type: 'error', error: error.message });
            process.exit(1);
        }
    }
});
