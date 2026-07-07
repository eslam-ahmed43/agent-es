import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { seedGoldDataset, runJudgeValidation, getJudgeReports, getGoldDataset } from '../services/judge-validation.service'

export const seedDataset = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await seedGoldDataset(req.user!.id)
        res.json({ success: true, message: 'Gold dataset seeded with 10 examples' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to seed dataset' })
    }
}

export const validateJudge = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await runJudgeValidation()
        res.json({ success: true, data: result })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Validation failed' })
    }
}

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const data = await getJudgeReports()
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get reports' })
    }
}

export const getDataset = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const data = await getGoldDataset()
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get dataset' })
    }
}