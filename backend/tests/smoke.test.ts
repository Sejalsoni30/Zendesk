import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { darwinboxMock, boxMock, zendeskMock } from '../src/services/index.js';

describe('Phase 1 Smoke Tests', () => {
  it('GET / should return basic service info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Zendesk–Darwinbox–Box');
  });

  it('GET /api/v1/health should respond with system health status', async () => {
    const res = await request(app).get('/api/v1/health');
    // Status can be 200 (if emulator connected) or 503 (if emulator not running), but body must be structured
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('mockMode', true);
    expect(res.body).toHaveProperty('services');
  });

  it('Darwinbox mock service should verify active employee and detect inactive', async () => {
    const active = await darwinboxMock.verifyEmployee('EMP-1001');
    expect(active.verified).toBe(true);
    expect(active.status).toBe('ACTIVE');
    expect(active.department).toBe('Engineering');

    const inactive = await darwinboxMock.verifyEmployee('EMP-9999');
    expect(inactive.verified).toBe(false);
    expect(inactive.status).toBe('TERMINATED');

    const notFound = await darwinboxMock.verifyEmployee('EMP-NONEXISTENT');
    expect(notFound.verified).toBe(false);
    expect(notFound.status).toBe('NOT_FOUND');
  });

  it('Box mock service should find-or-create folders without duplicates', async () => {
    // 1. Create a new case folder
    const folder = await boxMock.createFolder('CASE-ZD-1042');
    expect(folder.folderId).toBeDefined();
    expect(folder.isExisting).toBe(false);

    // 2. Finding it should return the exact same folder
    const found = await boxMock.findFolder('CASE-ZD-1042');
    expect(found).not.toBeNull();
    expect(found?.folderId).toBe(folder.folderId);

    // 3. Trying to create again should safely return existing folder (no duplicate)
    const duplicateAttempt = await boxMock.createFolder('CASE-ZD-1042');
    expect(duplicateAttempt.folderId).toBe(folder.folderId);
    expect(duplicateAttempt.isExisting).toBe(true);
  });

  it('Zendesk mock service should verify valid signature and reject tampered signature', () => {
    const rawPayload = JSON.stringify({ ticket: { id: 1042, subject: 'HR Access' } });
    const timestamp = '1700000000';

    const validSignature = zendeskMock.generateTestSignature(rawPayload, timestamp);
    const isValid = zendeskMock.verifySignature(rawPayload, validSignature, timestamp);
    expect(isValid).toBe(true);

    const isTamperedValid = zendeskMock.verifySignature(rawPayload + 'tampered', validSignature, timestamp);
    expect(isTamperedValid).toBe(false);
  });
});

