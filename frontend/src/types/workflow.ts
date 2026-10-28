export type WorkflowStatus = 'received' | 'processing' | 'completed' | 'needs_approval' | 'failed';

export type TicketCategory = 'HR_ACCESS' | 'EQUIPMENT' | 'PAYROLL_INQUIRY' | 'SECURITY_EXCEPTION';

export interface AuditLogItem {
  id: string;
  action: string;
  actor: string;
  result: 'SUCCESS' | 'FAILURE' | 'WAITING_APPROVAL';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface WorkflowTicket {
  idempotencyKey: string;
  ticketId: string;
  subject: string;
  category: TicketCategory;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  employeeId: string;
  employeeName?: string;
  department?: string;
  status: WorkflowStatus;
  currentStep: 'webhook_received' | 'verifying_employee' | 'resolving_box_folder' | 'updating_zendesk' | 'finalizing';
  boxFolderId?: string;
  boxFolderUrl?: string;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  auditLogs: AuditLogItem[];
}

export type UserRole = 'admin' | 'approver' | 'viewer';

