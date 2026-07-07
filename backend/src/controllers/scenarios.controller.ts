import { Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { AuthRequest } from '../middleware/auth'

export const getScenarios = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id } = req.query
    let query = supabaseAdmin.from('scenarios').select('*').order('created_at', { ascending: false })
    if (agent_id) query = query.eq('agent_id', agent_id)
    const { data, error } = await query
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.json({ success: true, data })
}

export const getScenario = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const { data, error } = await supabaseAdmin.from('scenarios').select('*').eq('id', id).single()
    if (error || !data) { res.status(404).json({ success: false, error: 'Scenario not found' }); return }
    res.json({ success: true, data })
}

export const createScenario = async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, type, persona, messages, expected_behavior, agent_id } = req.body
    if (!name || !type || !agent_id) { res.status(400).json({ success: false, error: 'name, type, and agent_id are required' }); return }
    const { data, error } = await supabaseAdmin.from('scenarios').insert({
        name, type, persona, messages: messages || [], expected_behavior, agent_id
    }).select().single()
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.status(201).json({ success: true, data, message: 'Scenario created successfully' })
}

export const deleteScenario = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const { error } = await supabaseAdmin.from('scenarios').delete().eq('id', id)
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.json({ success: true, message: 'Scenario deleted successfully' })
}