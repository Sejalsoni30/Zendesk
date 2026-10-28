export const WORKFLOW_STEPS = {
  WEBHOOK_RECEIVED: 'webhook_received',
  VERIFYING_EMPLOYEE: 'verifying_employee',
  RESOLVING_BOX_FOLDER: 'resolving_box_folder',
  UPDATING_ZENDESK: 'updating_zendesk',
  FINALIZING: 'finalizing',
} as const;

export type WorkflowStep = typeof WORKFLOW_STEPS[keyof typeof WORKFLOW_STEPS];

