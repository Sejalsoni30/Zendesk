import { config } from '../config/env.js';
import { IDarwinboxService, IBoxService, IZendeskService } from './interfaces.js';
import { darwinboxMock } from './darwinbox/darwinboxMock.js';
import { boxMock } from './box/boxMock.js';
import { zendeskMock } from './zendesk/zendeskMock.js';

export * from './interfaces.js';
export { darwinboxMock, boxMock, zendeskMock };

// Export the active service implementations based on configuration
export const darwinboxService: IDarwinboxService = darwinboxMock;
export const boxService: IBoxService = boxMock;
export const zendeskService: IZendeskService = zendeskMock;

if (config.USE_MOCK_SERVICES) {
  console.log('⚡ Services configured in MOCK MODE (Zero real credentials required)');
} else {
  console.log('🌐 Services configured in REAL API MODE');
}

