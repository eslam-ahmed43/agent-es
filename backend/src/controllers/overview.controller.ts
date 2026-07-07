import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { getReliabilityScore, getPerformanceAnalytics } from '../services/analytics.service'

export const getAgentOverview = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id

    try {
        const { data: agent } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('id', agent_id)
            .single()

        if (!agent) {
            res.status(404).json({ success: false, error: 'Agent not found' })
            return
        }

        const reliability = await getReliabilityScore(agent_id)
        const analytics = await getPerformanceAnalytics(agent_id)

        const { data: versions } = await supabaseAdmin
            .from('prompt_versions')
            .select('*')
            .eq('agent_id', agent_id)
            .order('version_number', { ascending: false })
            .limit(2)

        const current_version = versions?.[0] || null
        const previous_version = versions?.[1] || null

        let last_improvement = null
        if (current_version && previous_version && current_version.overall_score !== null && previous_version.overall_score !== null) {
            last_improvement = {
                from_version: previous_version.version_number,
                to_version: current_version.version_number,
                overall_change: current_version.overall_score - previous_version.overall_score,
                attack_change: current_version.attack_score !== null && previous_version.attack_score !== null
                    ? current_version.attack_score - previous_version.attack_score
                    : null,
                improvements: current_version.improvements_applied || []
            }
        }

        const { data: lastRegression } = await supabaseAdmin
            .from('regression_runs')
            .select('*')
            .eq('agent_id', agent_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        res.json({
            success: true,
            data: {
                agent: { id: agent.id, name: agent.name, model: agent.model, type: agent.type },
                reliability,
                weaknesses: analytics?.weaknesses || [],
                strengths: analytics?.strengths || [],
                current_version,
                last_improvement,
                last_regression: lastRegression || null
            }
        })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get overview' })
    }
}