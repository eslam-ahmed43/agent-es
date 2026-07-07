import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { generateScenarios, ScenarioGenerationOptions } from '../services/scenario-engine'
import { supabaseAdmin } from '../lib/supabase'

export const generateAndSaveScenarios = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, count, types, provider, model } = req.body

    if (!agent_id) {
        res.status(400).json({ success: false, error: 'agent_id is required' })
        return
    }

    const { data: agent, error: agentError } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', agent_id)
        .single()

    if (agentError || !agent) {
        res.status(404).json({ success: false, error: 'Agent not found' })
        return
    }

    const options: ScenarioGenerationOptions = {
        agent_name: agent.name,
        agent_domain: agent.domain || 'general',
        system_prompt: agent.system_prompt || '',
        count: count || 20,
        types: types || ['persona', 'edge_case', 'attack', 'long_conversation'],
        provider: provider || 'gemini',
        model: model || 'gemini-2.5-flash'
    }

    const scenarios = await generateScenarios(options)

    if (scenarios.length === 0) {
        res.status(500).json({ success: false, error: 'Failed to generate scenarios' })
        return
    }

    const toInsert = scenarios.map(s => ({
        name: s.name,
        type: s.type,
        persona: s.persona,
        messages: s.messages,
        expected_behavior: s.expected_behavior,
        agent_id
    }))

    const { data, error } = await supabaseAdmin
        .from('scenarios')
        .insert(toInsert)
        .select()

    if (error) {
        res.status(500).json({ success: false, error: error.message })
        return
    }

    res.status(201).json({
        success: true,
        data,
        message: `Generated and saved ${data.length} scenarios successfully`
    })
}

export const previewScenarios = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, count, types, provider, model } = req.body

    if (!agent_id) {
        res.status(400).json({ success: false, error: 'agent_id is required' })
        return
    }

    const { data: agent, error: agentError } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', agent_id)
        .single()

    if (agentError || !agent) {
        res.status(404).json({ success: false, error: 'Agent not found' })
        return
    }

    const options: ScenarioGenerationOptions = {
        agent_name: agent.name,
        agent_domain: agent.domain || 'general',
        system_prompt: agent.system_prompt || '',
        count: count || 5,
        types: types || ['persona', 'edge_case'],
        provider: provider || 'gemini',
        model: model || 'gemini-2.5-flash'
    }

    const scenarios = await generateScenarios(options)

    res.json({
        success: true,
        data: scenarios,
        message: `Preview of ${scenarios.length} scenarios`
    })
}