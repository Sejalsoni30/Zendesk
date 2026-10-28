import { zendeskService } from '../services/index.js';
export function validateZendeskWebhookSignature(req, res, next) {
    const signature = (req.headers['x-zendesk-webhook-signature'] ||
        req.headers['x-zendesk-signature']);
    const timestamp = req.headers['x-zendesk-webhook-signature-timestamp'];
    // Retrieve raw byte buffer preserved during JSON parsing
    const rawBody = req.rawBody;
    if (!signature) {
        res.status(401).json({
            error: 'Unauthorized',
            code: 'ERR_MISSING_WEBHOOK_SIGNATURE',
            message: 'Missing required header: X-Zendesk-Webhook-Signature',
        });
        return;
    }
    if (!rawBody) {
        res.status(400).json({
            error: 'Bad Request',
            code: 'ERR_RAW_BODY_MISSING',
            message: 'Raw body buffer missing. Webhook verification requires untouched raw payload.',
        });
        return;
    }
    const isValid = zendeskService.verifySignature(rawBody, signature, timestamp);
    if (!isValid) {
        res.status(401).json({
            error: 'Unauthorized',
            code: 'ERR_INVALID_WEBHOOK_SIGNATURE',
            message: 'Cryptographic signature mismatch. Payload may have been tampered with or key is invalid.',
        });
        return;
    }
    next();
}
