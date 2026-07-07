import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { enrichVersionScores, getVersionsWithScores, compareVersions, rollbackToVersion } from '../services/versioning.service'

export const enrich = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    try {
        const result = await enrichVersionScores(id)
        if (!result.enriched) {
            res.status(400).json({ success: false, error: result.reason })
            return
        }
        res.json({ success: true, message: 'Version scores updated' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to enrich version' })
    }
}

export const list = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getVersionsWithScores(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get versions' })
    }
}

export const compare = async (req: AuthRequest, res: Response): Promise<void> => {
    const { version_a_id, version_b_id } = req.query

    if (!version_a_id || !version_b_id) {
        res.status(400).json({ success: false, error: 'version_a_id and version_b_id are required' })
        return
    }

    try {
        const data = await compareVersions(version_a_id as string, version_b_id as string)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Comparison failed' })
    }
}

export const rollback = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, version_id } = req.body

    if (!agent_id || !version_id) {
        res.status(400).json({ success: false, error: 'agent_id and version_id are required' })
        return
    }

    try {
        await rollbackToVersion(agent_id, version_id)
        res.json({ success: true, message: 'Rolled back successfully' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Rollback failed' })
    }
}