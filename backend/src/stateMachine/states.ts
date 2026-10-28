export const WORKFLOW_STATES = {
  RECEIVED: 'received',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  NEEDS_APPROVAL: 'needs_approval',
  FAILED: 'failed',
} as const;

export type WorkflowState = typeof WORKFLOW_STATES[keyof typeof WORKFLOW_STATES];
