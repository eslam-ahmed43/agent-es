import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { discoverMCPAgent, saveMCPSession, getMCPSession, getRecommendedBenchmarks } from '../services/mcp-discovery.service'
import { supabaseAdmin } from '../lib/supabase'

export const discover = async (req: AuthRequest, res: Response): Promise<void> => {
    const { mcp_url, api_key, agent_id } = req.body
    if (!mcp_url) { res.status(400).json({ success: false, error: 'mcp_url is required' }); return }

    try {
        const discovery = await discoverMCPAgent(mcp_url, api_key)

        if (agent_id) {
            await saveMCPSession(agent_id, mcp_url, discovery)
        }

        const benchmarks = await getRecommendedBenchmarks(discovery.agent_type, discovery.domain)

        res.json({
            success: true,
            data: {
                ...discovery,
                recommended_benchmarks: benchmarks
            }
        })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Discovery failed' })
    }
}

export const getSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const session = await getMCPSession(agent_id)
        res.json({ success: true, data: session })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get session' })
    }
}

export const connectMCP = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, mcp_url, api_key } = req.body
    if (!agent_id || !mcp_url) { res.status(400).json({ success: false, error: 'agent_id and mcp_url required' }); return }

    try {
        const discovery = await discoverMCPAgent(mcp_url, api_key)
        await saveMCPSession(agent_id, mcp_url, discovery)
        const benchmarks = await getRecommendedBenchmarks(discovery.agent_type, discovery.domain)

        res.json({
            success: true,
            data: { ...discovery, recommended_benchmarks: benchmarks },
            message: `Discovered ${discovery.tools.length} tools. Agent type: ${discovery.agent_type}`
        })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Connection failed' })
    }
}

export const listConnected = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { data } = await supabaseAdmin
            .from('mcp_sessions')
            .select('*, agents(name, type)')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
        res.json({ success: true, data: data || [] })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to list sessions' })
    }
}