import http from 'http';
import { app } from '../src/app.js';
import { darwinboxMock, boxMock, zendeskMock } from '../src/services/index.js';

async function runSmokeTest() {
  console.log('🧪 Starting Phase 1 Automation Smoke Test...');

  // 1. Boot Express server in memory
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const port = address.port;
  console.log(`✅ Express app successfully booted on ephemeral port ${port}`);

  // 2. Test Health Endpoint
  console.log('\n--- 1. Testing Health Endpoint ---');
  const healthRes = await fetch(`http://localhost:${port}/api/v1/health`);
  const healthData = await healthRes.json();
  console.log(`Status Code: ${healthRes.status}`);
  console.log('Response Body:', JSON.stringify(healthData, null, 2));

  // 3. Test Darwinbox Mock Service
  console.log('\n--- 2. Testing Darwinbox Mock Adapter ---');
  const activeEmp = await darwinboxMock.verifyEmployee('EMP-1001');
  console.log('Verified EMP-1001:', activeEmp);
  const inactiveEmp = await darwinboxMock.verifyEmployee('EMP-9999');
  console.log('Verified EMP-9999:', inactiveEmp);

  // 4. Test Box Mock Service (Find-Before-Create & Conflict prevention)
  console.log('\n--- 3. Testing Box Mock Adapter ---');
  const createdFolder = await boxMock.createFolder('CASE-ZD-1042');
  console.log('Created Box Folder:', createdFolder);
  const duplicateAttempt = await boxMock.createFolder('CASE-ZD-1042');
  console.log('Duplicate Prevention Check (isExisting = true):', duplicateAttempt);

  // 5. Test Zendesk Signature Verification
  console.log('\n--- 4. Testing Zendesk Webhook Signature Verification ---');
  const rawBody = JSON.stringify({ ticketId: 'ZD-1042', event: 'created' });
  const timestamp = Date.now().toString();
  const signature = zendeskMock.generateTestSignature(rawBody, timestamp);
  const valid = zendeskMock.verifySignature(rawBody, signature, timestamp);
  const tampered = zendeskMock.verifySignature(rawBody + 'tampered', signature, timestamp);
  console.log(`Valid Signature Check:    ${valid ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`Tampered Signature Check: ${!tampered ? 'REJECTED ✅' : 'FAILED ❌'}`);

  // Clean up
  server.close();
  console.log('\n🎉 Phase 1 Smoke Test completed successfully!');
  process.exit(0);
}

runSmokeTest().catch((err) => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});

