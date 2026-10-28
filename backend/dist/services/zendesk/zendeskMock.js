import crypto from 'crypto';
import { config } from '../../config/env.js';
export class ZendeskMockService {
    updatedTickets = new Map();
    forcedFailure = null;
    setForcedFailure(failure) {
        this.forcedFailure = failure;
    }
    /**
     * Validates Zendesk HMAC-SHA256 signature using constant-time string comparison.
     * Zendesk signs: [timestamp] + [rawBody] using the Webhook Secret key.
     */
    verifySignature(rawBody, signature, timestamp) {
        if (!signature || !config.ZENDESK_WEBHOOK_SECRET) {
            return false;
        }
        try {
            const payloadToSign = timestamp
                ? `${timestamp}${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}`
                : typeof rawBody === 'string'
                    ? rawBody
                    : rawBody.toString('utf8');
            const expectedHmac = crypto
                .createHmac('sha256', config.ZENDESK_WEBHOOK_SECRET)
                .update(payloadToSign, 'utf8')
                .digest('base64');
            const sigBuffer = Buffer.from(signature, 'base64');
            const expectedBuffer = Buffer.from(expectedHmac, 'base64');
            if (sigBuffer.length !== expectedBuffer.length) {
                return false;
            }
            // Timing-safe comparison prevents timing attacks
            return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
        }
        catch (err) {
            return false;
        }
    }
    /**
     * Helper to generate a valid test signature for automated tests and webhooks
     */
    generateTestSignature(rawBody, timestamp) {
        const payloadToSign = timestamp ? `${timestamp}${rawBody}` : rawBody;
        return crypto
            .createHmac('sha256', config.ZENDESK_WEBHOOK_SECRET)
            .update(payloadToSign, 'utf8')
            .digest('base64');
    }
    async updateTicket(ticketId, payload) {
        if (config.SIMULATE_LATENCY_MS > 0) {
            await new Promise((r) => setTimeout(r, config.SIMULATE_LATENCY_MS));
        }
        if (!config.ZENDESK_WRITEBACK_ENABLED) {
            return {
                success: false,
                ticketId,
                updatedAt: new Date().toISOString(),
                commentId: undefined,
            };
        }
        if (this.forcedFailure === 'API_ERROR' || ticketId.includes('FAIL')) {
            const err = new Error('Zendesk API 500 Internal Server Error');
            err.status = 500;
            err.code = 'ZENDESK_API_ERROR';
            throw err;
        }
        const updates = this.updatedTickets.get(ticketId) || [];
        const record = { payload, timestamp: new Date().toISOString() };
        updates.push(record);
        this.updatedTickets.set(ticketId, updates);
        return {
            success: true,
            ticketId,
            updatedAt: record.timestamp,
            commentId: `comm_${Math.random().toString(36).substring(2, 9)}`,
        };
    }
    getTicketUpdates(ticketId) {
        return this.updatedTickets.get(ticketId) || [];
    }
    reset() {
        this.updatedTickets.clear();
        this.forcedFailure = null;
    }
}
export const zendeskMock = new ZendeskMockService();
