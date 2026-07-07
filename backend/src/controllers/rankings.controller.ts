import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { computeWeeklyRankings, getCurrentWeekRankings, getTopAgentOfWeek } from '../services/rankings.service'

export const refresh = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await computeWeeklyRankings()
        res.json({ success: true, message: 'Weekly rankings updated' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to compute rankings' })
    }
}

export const getRankings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const data = await getCurrentWeekRankings()
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get rankings' })
    }
}

export const getTopAgent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const data = await getTopAgentOfWeek()
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get top agent' })
    }
}