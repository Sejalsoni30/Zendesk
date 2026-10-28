import { z } from 'zod';
export const zendeskTicketWebhookSchema = z.object({
    event: z.enum(['ticket.created', 'ticket.updated', 'ticket_created', 'ticket_updated']).default('ticket.created'),
    idempotency_key: z.string().optional(),
    ticket: z.object({
        id: z.coerce.string(),
        subject: z.string().min(1, 'Subject is required'),
        category: z.enum(['HR_ACCESS', 'EQUIPMENT', 'PAYROLL_INQUIRY', 'SECURITY_EXCEPTION', 'GENERAL']).default('GENERAL'),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
        status: z.enum(['new', 'open', 'pending', 'hold', 'solved', 'closed']).default('new'),
        requester: z.object({
            id: z.coerce.string().optional(),
            name: z.string().optional(),
            email: z.string().email().optional(),
            employee_id: z.string().optional(),
        }).optional(),
        custom_fields: z.record(z.any()).optional(),
    }),
});
