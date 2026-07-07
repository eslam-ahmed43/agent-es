import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { executeRun, healthCheckAgent } from '../services/execution-engine'
import { supabaseAdmin } from '../lib/supabase'

export const startRun = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, project_id, scenario_ids } = req.body

    if (!agent_id || !project_id || !scenario_ids?.length) {
        res.status(400).json({ success: false, error: 'agent_id, project_id, and scenario_ids are required' })
        return
    }

    const { data: run, error } = await supabaseAdmin.from('runs').insert({
        agent_id, project_id,
        status: 'pending',
        total_scenarios: scenario_ids.length,
        completed_scenarios: 0
    }).select().single()

    if (error || !run) {
        res.status(500).json({ success: false, error: error?.message || 'Failed to create run' })
        return
    }

    res.status(201).json({ success: true, data: run, message: 'Run started' })

    executeRun(run.id, agent_id, scenario_ids).catch(async (err) => {
        await supabaseAdmin.from('runs').update({ status: 'failed' }).eq('id', run.id)
        console.error('Run failed:', err)
    })
}

export const getRunStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const { data, error } = await supabaseAdmin
        .from('runs')
        .select('*, evaluations(*)')
        .eq('id', id)
        .single()

    if (error || !data) {
        res.status(404).json({ success: false, error: 'Run not found' })
        return
    }
    res.json({ success: true, data })
}

export const healthCheck = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const health = await healthCheckAgent(agent_id)
        res.json({ success: true, data: health })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Health check failed' })
    }
}

export const stopRun = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    try {
        await supabaseAdmin.from('runs').update({ cancelled: true, status: 'failed' }).eq('id', id)
        res.json({ success: true, message: 'Run stopped' })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to stop run' })
    }
}