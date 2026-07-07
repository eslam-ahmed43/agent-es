import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { getLeaderboard, getAllLeaderboards } from '../services/leaderboard.service'

export const getBenchmarkLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Array.isArray(req.params.benchmark_id) ? req.params.benchmark_id[0] : req.params.benchmark_id
        const data = await getLeaderboard(id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get leaderboard' })
    }
}

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const data = await getAllLeaderboards()
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get leaderboards' })
    }
}