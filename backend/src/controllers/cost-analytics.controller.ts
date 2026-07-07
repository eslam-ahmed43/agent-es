import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { getCostAnalytics, getCostSummary, computeAllRunsCost, computeRunCost } from '../services/cost-analytics.service'

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getCostAnalytics(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get analytics' })
    }
}

export const getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getCostSummary(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get summary' })
    }
}

export const computeAll = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id } = req.body
    if (!agent_id) { res.status(400).json({ success: false, error: 'agent_id is required' }); return }
    try {
        const count = await computeAllRunsCost(agent_id)
        res.json({ success: true, data: { computed: count }, message: `Computed cost for ${count} new runs` })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to compute costs' })
    }
}

export const computeOne = async (req: AuthRequest, res: Response): Promise<void> => {
    const { run_id } = req.body
    if (!run_id) { res.status(400).json({ success: false, error: 'run_id is required' }); return }
    try {
        await computeRunCost(run_id)
        res.json({ success: true, message: 'Cost computed for run' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to compute cost' })
    }
}