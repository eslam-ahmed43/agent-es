import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { runRegressionSuite, getRegressionRuns, getRegressionRun, stopRegressionRun } from '../services/regression.service'
import { supabaseAdmin } from '../lib/supabase'

export const startRegression = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, prompt_version_id } = req.body

    if (!agent_id) {
        res.status(400).json({ success: false, error: 'agent_id is required' })
        return
    }

    try {
        const { data: regression, error } = await supabaseAdmin
            .from('regression_runs')
            .insert({
                agent_id,
                prompt_version_id: prompt_version_id || null,
                triggered_by: 'manual',
                status: 'running'
            })
            .select().single()

        if (error || !regression) {
            res.status(500).json({ success: false, error: 'Failed to create regression run' })
            return
        }

        res.status(201).json({ success: true, data: { regression_id: regression.id }, message: 'Regression suite started' })

        runRegressionSuite(agent_id, regression.id).catch(async (err) => {
            console.error('Regression failed:', err)
            await supabaseAdmin.from('regression_runs')
                .update({ status: 'failed' }).eq('id', regression.id)
        })

    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to start regression' })
    }
}

export const stopRegression = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    try {
        await stopRegressionRun(id)
        res.json({ success: true, message: 'Regression stopped' })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to stop regression' })
    }
}

export const listRegressionRuns = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getRegressionRuns(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get regression runs' })
    }
}

export const getRegressionById = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    try {
        const data = await getRegressionRun(id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(404).json({ success: false, error: err instanceof Error ? err.message : 'Not found' })
    }
}