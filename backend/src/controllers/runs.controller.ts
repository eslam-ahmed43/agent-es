import { Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { AuthRequest } from '../middleware/auth'

export const getRuns = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, project_id } = req.query
    let query = supabaseAdmin.from('runs').select('*').order('created_at', { ascending: false })
    if (agent_id) query = query.eq('agent_id', agent_id)
    if (project_id) query = query.eq('project_id', project_id)
    const { data, error } = await query
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.json({ success: true, data })
}

export const getRun = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const { data, error } = await supabaseAdmin.from('runs').select('*, evaluations(*)').eq('id', id).single()
    if (error || !data) { res.status(404).json({ success: false, error: 'Run not found' }); return }
    res.json({ success: true, data })
}

export const createRun = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, project_id, scenario_ids } = req.body
    if (!agent_id || !project_id) { res.status(400).json({ success: false, error: 'agent_id and project_id are required' }); return }
    const { data, error } = await supabaseAdmin.from('runs').insert({
        agent_id, project_id, status: 'pending',
        total_scenarios: scenario_ids?.length || 0, completed_scenarios: 0
    }).select().single()
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.status(201).json({ success: true, data, message: 'Run created successfully' })
}