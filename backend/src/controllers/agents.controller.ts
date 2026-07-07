import { Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { AuthRequest } from '../middleware/auth'

export const getAgents = async (req: AuthRequest, res: Response): Promise<void> => {
    const { project_id } = req.query
    let query = supabaseAdmin.from('agents').select('*').order('created_at', { ascending: false })
    if (project_id) query = query.eq('project_id', project_id)
    const { data, error } = await query
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.json({ success: true, data })
}

export const getAgent = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const { data, error } = await supabaseAdmin.from('agents').select('*').eq('id', id).single()
    if (error || !data) { res.status(404).json({ success: false, error: 'Agent not found' }); return }
    res.json({ success: true, data })
}

export const createAgent = async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, description, domain, type, system_prompt, endpoint_url, api_key, model, project_id } = req.body
    if (!name || !type || !project_id) { res.status(400).json({ success: false, error: 'name, type, and project_id are required' }); return }
    const { data, error } = await supabaseAdmin.from('agents').insert({
        name, description, domain, type, system_prompt,
        endpoint_url, api_key_encrypted: api_key, model,
        project_id, created_by: req.user!.id, version: '1.0.0'
    }).select().single()
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.status(201).json({ success: true, data, message: 'Agent created successfully' })
}

export const updateAgent = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const { data, error } = await supabaseAdmin.from('agents').update(req.body).eq('id', id).select().single()
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.json({ success: true, data, message: 'Agent updated successfully' })
}

export const deleteAgent = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const { error } = await supabaseAdmin.from('agents').delete().eq('id', id)
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.json({ success: true, message: 'Agent deleted successfully' })
}