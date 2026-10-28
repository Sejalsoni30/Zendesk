import { WORKFLOW_STATES, WorkflowState } from './states.js';

export class InvalidStateTransitionError extends Error {
  public fromState: string;
  public toState: string;

  constructor(fromState: string, toState: string, reason?: string) {
    super(`Illegal state transition from '${fromState}' to '${toState}'.${reason ? ` Reason: ${reason}` : ''}`);
    this.name = 'InvalidStateTransitionError';
    this.fromState = fromState;
    this.toState = toState;
  }
}

/**
 * Single source of truth for all permitted state machine transitions.
 * Any state transition not explicitly listed here is strictly prohibited.
 */
export const ALLOWED_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  [WORKFLOW_STATES.RECEIVED]: [
    WORKFLOW_STATES.PROCESSING,
    WORKFLOW_STATES.FAILED,
  ],
  [WORKFLOW_STATES.PROCESSING]: [
    WORKFLOW_STATES.COMPLETED,
    WORKFLOW_STATES.NEEDS_APPROVAL,
    WORKFLOW_STATES.FAILED,
  ],
  [WORKFLOW_STATES.NEEDS_APPROVAL]: [
    WORKFLOW_STATES.PROCESSING,
    WORKFLOW_STATES.FAILED,
  ],
  [WORKFLOW_STATES.FAILED]: [
    WORKFLOW_STATES.PROCESSING, // Manual retry allowed
  ],
  [WORKFLOW_STATES.COMPLETED]: [], // Terminal state - immutable once completed
};

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateTransition(from: WorkflowState, to: WorkflowState): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

