import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { generateFingerprint, getFingerprint } from '../services/fingerprint.service'
import { supabaseAdmin } from '../lib/supabase'

export const analyze = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, tools, mcp_url, reliability_score } = req.body
    if (!agent_id || !tools) { res.status(400).json({ success: false, error: 'agent_id and tools required' }); return }
    try {
        const fingerprint = await generateFingerprint(agent_id, tools, mcp_url || '', reliability_score || 0)
        res.json({ success: true, data: fingerprint })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Analysis failed' })
    }
}

export const get = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getFingerprint(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get fingerprint' })
    }
}

export const analyzeFromAgent = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const { data: agent } = await supabaseAdmin.from('agents').select('*').eq('id', agent_id).single()
        if (!agent) { res.status(404).json({ success: false, error: 'Agent not found' }); return }

        const tools = agent.mcp_tools || []
        const mcp_url = agent.mcp_url || ''

        const { data: reliability } = await supabaseAdmin
            .from('historical_scores').select('overall_score').eq('agent_id', agent_id)
            .order('recorded_at', { ascending: false }).limit(1).maybeSingle()

        const fingerprint = await generateFingerprint(agent_id, tools, mcp_url, (reliability?.overall_score || 0) * 100)
        res.json({ success: true, data: fingerprint })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Analysis failed' })
    }
}