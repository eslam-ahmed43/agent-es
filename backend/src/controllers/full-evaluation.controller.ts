import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { startFullEvaluation, getFullEvaluation, getAgentEvaluations } from '../services/full-evaluation.service'

export const start = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id } = req.body
    if (!agent_id) { res.status(400).json({ success: false, error: 'agent_id required' }); return }
    try {
        const evaluation_id = await startFullEvaluation(agent_id)
        res.json({ success: true, data: { evaluation_id }, message: 'Full evaluation started' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to start' })
    }
}

export const getOne = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    try {
        const data = await getFullEvaluation(id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get evaluation' })
    }
}

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getAgentEvaluations(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get evaluations' })
    }
}