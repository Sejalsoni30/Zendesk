import crypto from 'crypto';
import { config } from '../../config/env.js';
import { IZendeskService, ZendeskTicketUpdatePayload, ZendeskUpdateResult } from '../interfaces.js';

export class ZendeskMockService implements IZendeskService {
  private updatedTickets: Map<string, Array<{ payload: ZendeskTicketUpdatePayload; timestamp: string }>> = new Map();
  private forcedFailure: 'API_ERROR' | 'UNAUTHORIZED' | null = null;

  public setForcedFailure(failure: 'API_ERROR' | 'UNAUTHORIZED' | null) {
    this.forcedFailure = failure;
  }

  /**
   * Validates Zendesk HMAC-SHA256 signature using constant-time string comparison.
   * Zendesk signs: [timestamp] + [rawBody] using the Webhook Secret key.
   */
  verifySignature(rawBody: Buffer | string, signature: string, timestamp?: string): boolean {
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
    } catch (err) {
      return false;
    }
  }

  /**
   * Helper to generate a valid test signature for automated tests and webhooks
   */
  generateTestSignature(rawBody: string, timestamp?: string): string {
    const payloadToSign = timestamp ? `${timestamp}${rawBody}` : rawBody;
    return crypto
      .createHmac('sha256', config.ZENDESK_WEBHOOK_SECRET)
      .update(payloadToSign, 'utf8')
      .digest('base64');
  }

  async updateTicket(ticketId: string, payload: ZendeskTicketUpdatePayload): Promise<ZendeskUpdateResult> {
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
      const err: any = new Error('Zendesk API 500 Internal Server Error');
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

  public getTicketUpdates(ticketId: string) {
    return this.updatedTickets.get(ticketId) || [];
  }

  public reset() {
    this.updatedTickets.clear();
    this.forcedFailure = null;
  }
}

export const zendeskMock = new ZendeskMockService();

