import { Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { AuthRequest } from '../middleware/auth'

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
    const { data, error } = await supabaseAdmin.from('projects').select('*, agents(count)').eq('created_by', req.user!.id).order('created_at', { ascending: false })
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.json({ success: true, data })
}

export const getProject = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const { data, error } = await supabaseAdmin.from('projects').select('*, agents(*)').eq('id', id).single()
    if (error || !data) { res.status(404).json({ success: false, error: 'Project not found' }); return }
    res.json({ success: true, data })
}

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, description, org_id } = req.body
    if (!name) { res.status(400).json({ success: false, error: 'name is required' }); return }
    const { data, error } = await supabaseAdmin.from('projects').insert({
        name, description, org_id: org_id || null, created_by: req.user!.id
    }).select().single()
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.status(201).json({ success: true, data, message: 'Project created successfully' })
}

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const { name, description } = req.body
    const { data, error } = await supabaseAdmin.from('projects').update({ name, description }).eq('id', id).select().single()
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.json({ success: true, data, message: 'Project updated successfully' })
}

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const { error } = await supabaseAdmin.from('projects').delete().eq('id', id)
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.json({ success: true, message: 'Project deleted successfully' })
}