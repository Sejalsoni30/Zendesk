import { Router } from 'express';
import {
  listWorkflows,
  getWorkflowDetail,
  approveWorkflow,
  rejectWorkflow,
} from '../controllers/workflowController.js';

const router = Router();

router.get('/', listWorkflows);
router.get('/:id', getWorkflowDetail);
router.post('/:id/approve', approveWorkflow);
router.post('/:id/reject', rejectWorkflow);

export default router;
