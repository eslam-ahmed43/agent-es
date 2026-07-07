import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { getHistoricalScores, getReliabilityScore, getPerformanceAnalytics } from '../services/analytics.service'

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    const { benchmark_id } = req.query
    try {
        const data = await getHistoricalScores(agent_id, benchmark_id as string)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get history' })
    }
}

export const getReliability = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getReliabilityScore(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get reliability score' })
    }
}

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getPerformanceAnalytics(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get analytics' })
    }
}