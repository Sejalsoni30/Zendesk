/**
 * Service contracts for external platforms.
 * These interfaces enforce the Dependency Inversion Principle: the core workflow engine
 * depends only on abstractions, not on concrete Zendesk/Darwinbox/Box SDKs or HTTP clients.
 */

// Minimum Darwinbox Employee Profile (Zero PII - GDPR/Privacy compliant)
export interface EmployeeVerificationResult {
  verified: boolean;
  employeeId: string;
  name?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'NOT_FOUND';
  department?: string;
  designation?: string;
  managerId?: string;
  managerName?: string;
  managerEmail?: string;
  isEligibleForAccess: boolean;
  errorCode?: 'NOT_FOUND' | 'AUTH_FAILURE' | 'RATE_LIMITED' | 'TIMEOUT' | 'UNKNOWN';
}

export interface IDarwinboxService {
  verifyEmployee(employeeId: string): Promise<EmployeeVerificationResult>;
}

export interface BoxCollaborator {
  email: string;
  role: 'editor' | 'viewer' | 'co-owner';
}

export interface BoxProvisionOptions {
  ticketId: string;
  employeeId: string;
  employeeName?: string;
  collaborators?: BoxCollaborator[];
}

export interface BoxFolderResult {
  folderId: string;
  folderName: string;
  folderPath?: string;
  folderUrl: string;
  sharedLink?: string;
  collaborators?: BoxCollaborator[];
  isExisting: boolean;
}

export interface IBoxService {
  findFolder(folderName: string, parentFolderId?: string): Promise<BoxFolderResult | null>;
  createFolder(folderName: string, parentFolderId?: string): Promise<BoxFolderResult>;
  provisionCaseFolder(options: BoxProvisionOptions): Promise<BoxFolderResult>;
  getFolderUrl(folderId: string): Promise<string>;
}

export interface ZendeskTicketUpdatePayload {
  comment: string;
  status?: 'open' | 'pending' | 'solved' | 'closed';
  tags?: string[];
  customFields?: Record<string, string | number | boolean>;
}

export interface ZendeskUpdateResult {
  success: boolean;
  ticketId: string;
  updatedAt: string;
  commentId?: string;
}

export interface IZendeskService {
  verifySignature(rawBody: Buffer | string, signature: string, timestamp?: string): boolean;
  updateTicket(ticketId: string, payload: ZendeskTicketUpdatePayload): Promise<ZendeskUpdateResult>;
}

