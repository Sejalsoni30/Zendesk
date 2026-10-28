import { Router } from 'express';
import { listWorkflows, getWorkflowDetail, approveWorkflow, rejectWorkflow, retryWorkflow, } from '../controllers/workflowController.js';
const router = Router();
router.get('/', listWorkflows);
router.get('/:id', getWorkflowDetail);
router.post('/:id/approve', approveWorkflow);
router.post('/:id/reject', rejectWorkflow);
router.post('/:id/retry', retryWorkflow);
export default router;
