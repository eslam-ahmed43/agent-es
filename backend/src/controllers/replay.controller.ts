import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { replayRun, getRunTrace } from '../services/replay-engine'

export const replay = async (req: AuthRequest, res: Response): Promise<void> => {
    const { run_id } = req.body

    if (!run_id) {
        res.status(400).json({ success: false, error: 'run_id is required' })
        return
    }

    try {
        const new_run_id = await replayRun(run_id, req.user!.id)
        res.status(201).json({ success: true, data: { new_run_id }, message: 'Replay started' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Replay failed' })
    }
}

export const getTrace = async (req: AuthRequest, res: Response): Promise<void> => {
    const run_id = Array.isArray(req.params.run_id) ? req.params.run_id[0] : req.params.run_id

    try {
        const traces = await getRunTrace(run_id)
        res.json({ success: true, data: traces })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get traces' })
    }
}