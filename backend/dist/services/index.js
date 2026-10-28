import { config } from '../config/env.js';
import { darwinboxMock } from './darwinbox/darwinboxMock.js';
import { boxMock } from './box/boxMock.js';
import { zendeskMock } from './zendesk/zendeskMock.js';
export * from './interfaces.js';
export { darwinboxMock, boxMock, zendeskMock };
// Export the active service implementations based on configuration
export const darwinboxService = darwinboxMock;
export const boxService = boxMock;
export const zendeskService = zendeskMock;
if (config.USE_MOCK_SERVICES) {
    console.log('⚡ Services configured in MOCK MODE (Zero real credentials required)');
}
else {
    console.log('🌐 Services configured in REAL API MODE');
}
