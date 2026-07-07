import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { analyzeWeakness, applyTargetedImprovement, verifyImprovement, getImprovements } from '../services/targeted-improve.service'

export const analyze = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, weakness_type } = req.body

    if (!agent_id || !weakness_type) {
        res.status(400).json({ success: false, error: 'agent_id and weakness_type are required' })
        return
    }

    try {
        const result = await analyzeWeakness(agent_id, weakness_type)
        res.json({ success: true, data: result, message: 'Targeted improvement generated' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Analysis failed' })
    }
}

export const apply = async (req: AuthRequest, res: Response): Promise<void> => {
    const { improvement_id } = req.body

    if (!improvement_id) {
        res.status(400).json({ success: false, error: 'improvement_id is required' })
        return
    }

    try {
        await applyTargetedImprovement(improvement_id)
        res.json({ success: true, message: 'Improvement applied' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Apply failed' })
    }
}

export const verify = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    try {
        const result = await verifyImprovement(id)
        res.json({ success: true, data: result })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Verify failed' })
    }
}

export const list = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id

    try {
        const data = await getImprovements(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get improvements' })
    }
}