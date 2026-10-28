import { workflowRepository } from '../repositories/workflowRepository.js';
import { ticketMappingRepository } from '../repositories/ticketMappingRepository.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { workflowEngine } from '../services/workflowEngine.js';
export async function listWorkflows(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const workflows = await workflowRepository.list(limit);
    res.json({ workflows, count: workflows.length });
}
export async function getWorkflowDetail(req, res) {
    const id = String(req.params.id);
    const workflow = await workflowRepository.getById(id);
    if (!workflow) {
        res.status(404).json({ error: 'Workflow not found', code: 'ERR_NOT_FOUND' });
        return;
    }
    const [mapping, auditLogs] = await Promise.all([
        ticketMappingRepository.getByTicketId(workflow.ticketId),
        auditLogRepository.getLogsByTicket(workflow.ticketId),
    ]);
    res.json({
        workflow,
        mapping,
        auditLogs,
    });
}
export async function approveWorkflow(req, res) {
    const id = String(req.params.id);
    const approverEmail = req.user?.email || req.body?.approverEmail || 'approver@example.com';
    try {
        await workflowEngine.approveWorkflow(id, approverEmail);
        res.json({ message: `Workflow ${id} approved successfully`, status: 'processing' });
    }
    catch (err) {
        res.status(400).json({ error: err.message, code: 'ERR_APPROVAL_FAILED' });
    }
}
export async function rejectWorkflow(req, res) {
    const id = String(req.params.id);
    const approverEmail = req.user?.email || req.body?.approverEmail || 'approver@example.com';
    const reason = req.body?.reason;
    try {
        await workflowEngine.rejectWorkflow(id, approverEmail, reason);
        res.json({ message: `Workflow ${id} rejected`, status: 'failed' });
    }
    catch (err) {
        res.status(400).json({ error: err.message, code: 'ERR_REJECTION_FAILED' });
    }
}
export async function retryWorkflow(req, res) {
    const id = String(req.params.id);
    try {
        await workflowEngine.retryWorkflow(id);
        res.json({ message: `Workflow ${id} retry initiated`, status: 'processing' });
    }
    catch (err) {
        res.status(400).json({ error: err.message, code: 'ERR_RETRY_FAILED' });
    }
}
