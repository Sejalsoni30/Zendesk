import http from 'http';
import { app } from './app.js';
import { config } from './config/env.js';
import { initSocket } from './socket.js';
const httpServer = http.createServer(app);
// Initialize real-time WebSocket server
initSocket(httpServer);
const server = httpServer.listen(config.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Automation Backend Server running on port ${config.PORT}`);
    console.log(`📡 Environment: ${config.NODE_ENV}`);
    console.log(`⚡ Mock Mode:   ${config.USE_MOCK_SERVICES ? 'ENABLED (Zero credentials required)' : 'DISABLED (Real APIs)'}`);
    console.log(`🔌 WebSocket:   ws://localhost:${config.PORT}`);
    console.log(`🏥 Health Check: http://localhost:${config.PORT}${config.API_PREFIX}/health`);
    console.log(`====================================================`);
});
// Graceful shutdown handling
function handleShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
        console.log('✅ HTTP server closed. Process exiting.');
        process.exit(0);
    });
    // Force close after 5 seconds if connections linger
    setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 5000);
}
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
export { server };
