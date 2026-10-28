import { zendeskTicketWebhookSchema } from '../schemas/webhookPayload.js';
import { workflowEngine } from '../services/workflowEngine.js';
export async function handleZendeskWebhook(req, res) {
    // 1. Zod Payload Validation
    const parseResult = zendeskTicketWebhookSchema.safeParse(req.body);
    if (!parseResult.success) {
        res.status(400).json({
            error: 'Invalid Webhook Payload Structure',
            code: 'ERR_INVALID_PAYLOAD',
            issues: parseResult.error.issues.map((i) => ({
                path: i.path.join('.'),
                message: i.message,
            })),
        });
        return;
    }
    // 2. Ingest into Workflow Engine with Idempotency Protection
    const result = await workflowEngine.ingestWebhook(parseResult.data);
    // 3. Fast 202 Accepted Response (standard webhook protocol requirement)
    res.status(202).json({
        message: result.isDuplicate
            ? 'Duplicate webhook event received and safely suppressed'
            : 'Webhook event received and accepted for processing',
        idempotencyKey: result.idempotencyKey,
        ticketId: result.ticketId,
        status: result.status,
        isDuplicate: result.isDuplicate,
        timestamp: new Date().toISOString(),
    });
}
