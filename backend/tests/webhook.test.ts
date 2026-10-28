import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { zendeskMock, darwinboxMock, boxMock } from '../src/services/index.js';

describe('Zendesk Webhook & Integration Pipeline Tests', () => {
  beforeEach(() => {
    zendeskMock.reset();
    boxMock.reset();
  });

  it('should reject webhook request missing signature with 401', async () => {
    const payload = {
      event: 'ticket.created',
      ticket: {
        id: '1099',
        subject: 'Laptop Request',
        category: 'EQUIPMENT',
      },
    };

    const res = await request(app)
      .post('/api/webhooks/zendesk')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('ERR_MISSING_WEBHOOK_SIGNATURE');
  });

  it('should reject webhook with tampered/invalid signature', async () => {
    const payload = JSON.stringify({
      event: 'ticket.created',
      ticket: { id: '1099', subject: 'Laptop Request', category: 'EQUIPMENT' },
    });

    const res = await request(app)
      .post('/api/webhooks/zendesk')
      .set('Content-Type', 'application/json')
      .set('X-Zendesk-Webhook-Signature', 'invalid_base64_sig==')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('ERR_INVALID_WEBHOOK_SIGNATURE');
  });

  it('should accept valid webhook signature with 202 Accepted and idempotent key', async () => {
    const uniqueKey = `evt_zd_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payloadObj = {
      event: 'ticket.created',
      idempotency_key: uniqueKey,
      ticket: {
        id: 'ZD-1099',
        subject: 'Dev Equipment Provisioning',
        category: 'EQUIPMENT',
        priority: 'normal',
        requester: {
          employee_id: 'EMP-1001',
          name: 'Aarav Sharma',
        },
      },
    };

    const rawPayload = JSON.stringify(payloadObj);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = zendeskMock.generateTestSignature(rawPayload, timestamp);

    const res = await request(app)
      .post('/api/webhooks/zendesk')
      .set('Content-Type', 'application/json')
      .set('X-Zendesk-Webhook-Signature', signature)
      .set('X-Zendesk-Webhook-Signature-Timestamp', timestamp)
      .send(rawPayload);

    expect(res.status).toBe(202);
    expect(res.body.idempotencyKey).toBe(uniqueKey);
    expect(res.body.ticketId).toBe('ZD-1099');
    expect(res.body.isDuplicate).toBe(false);
  });

  it('should verify Darwinbox employee active status and cache OAuth token', async () => {
    const firstCall = await darwinboxMock.verifyEmployee('EMP-1001');
    expect(firstCall.verified).toBe(true);
    expect(firstCall.name).toBe('Aarav Sharma');
    expect(firstCall.managerId).toBe('MGR-5001');
    expect(firstCall.managerEmail).toBe('priya.iyer@example.com');

    // Token caching verification: second call reuses cached token
    const token1 = await darwinboxMock.getValidOAuthToken();
    const token2 = await darwinboxMock.getValidOAuthToken();
    expect(token1).toBe(token2);
  });

  it('should provision Box enterprise folder hierarchy with collaborators', async () => {
    const result = await boxMock.provisionCaseFolder({
      ticketId: 'ZD-1045',
      employeeId: 'EMP-1001',
      employeeName: 'Aarav Sharma',
      collaborators: [
        { email: 'priya.iyer@example.com', role: 'editor' },
        { email: 'hr-audit@example.com', role: 'viewer' },
      ],
    });

    expect(result.folderName).toBe('CASE-ZD-1045');
    expect(result.folderPath).toContain('/HR-Records/Employee-EMP-1001-AaravSharma/CASE-ZD-1045');
    expect(result.sharedLink).toContain('https://app.box.com/s/');
    expect(result.collaborators).toHaveLength(2);
    expect(result.isExisting).toBe(false);

    // Conflict handling test: calling again returns the existing folder safely
    const conflictResult = await boxMock.provisionCaseFolder({
      ticketId: 'ZD-1045',
      employeeId: 'EMP-1001',
      employeeName: 'Aarav Sharma',
    });
    expect(conflictResult.folderId).toBe(result.folderId);
    expect(conflictResult.isExisting).toBe(true);
  });
});

