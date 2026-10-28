import { z } from 'zod';

export const workflowStatusSchema = z.enum([
  'received',
  'processing',
  'completed',
  'needs_approval',
  'failed',
]);

export const workflowStepSchema = z.enum([
  'webhook_received',
  'verifying_employee',
  'resolving_box_folder',
  'updating_zendesk',
  'finalizing',
]);

export const auditLogSchema = z.object({
  workflowId: z.string(),
  ticketId: z.string(),
  actor: z.string().default('system'),
  action: z.string(),
  result: z.enum(['SUCCESS', 'FAILURE', 'WAITING_APPROVAL']),
  metadata: z.record(z.any()).optional(),
  timestamp: z.date(),
});

export const ticketMappingSchema = z.object({
  ticketId: z.string(),
  boxFolderId: z.string(),
  boxFolderUrl: z.string(),
  employeeReference: z.string(),
  status: z.enum(['active', 'archived']).default('active'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WorkflowStatusType = z.infer<typeof workflowStatusSchema>;
export type WorkflowStepType = z.infer<typeof workflowStepSchema>;
export type AuditLogDocument = z.infer<typeof auditLogSchema>;
export type TicketMappingDocument = z.infer<typeof ticketMappingSchema>;

