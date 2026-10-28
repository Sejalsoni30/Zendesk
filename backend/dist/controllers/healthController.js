import { config } from '../config/env.js';
import { checkFirestoreConnection } from '../config/firebase.js';
export async function getHealth(_req, res) {
    const isFirestoreConnected = await checkFirestoreConnection();
    const status = isFirestoreConnected ? 'healthy' : 'degraded';
    const statusCode = isFirestoreConnected || config.USE_MOCK_SERVICES ? 200 : 503;
    res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: config.NODE_ENV,
        mockMode: config.USE_MOCK_SERVICES,
        services: {
            firestore: isFirestoreConnected ? 'connected' : 'disconnected',
            zendesk: config.USE_MOCK_SERVICES ? 'mock' : 'real',
            darwinbox: config.USE_MOCK_SERVICES ? 'mock' : 'real',
            box: config.USE_MOCK_SERVICES ? 'mock' : 'real',
        },
        version: '1.0.0',
    });
}
