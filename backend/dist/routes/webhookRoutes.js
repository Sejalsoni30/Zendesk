import { Router } from 'express';
import { handleZendeskWebhook } from '../controllers/webhookController.js';
import { validateZendeskWebhookSignature } from '../middleware/webhookAuth.js';
const router = Router();
// Secure Zendesk Webhook Ingestion endpoint
// 1. Validates HMAC SHA-256 signature against raw byte payload
// 2. Ingests ticket creation and update events idempotently
router.post('/zendesk', validateZendeskWebhookSignature, handleZendeskWebhook);
export default router;
