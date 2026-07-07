import { supabaseAdmin } from '../lib/supabase'
import { callAI } from '../lib/ai-router'

export const analyzeWeakness = async (
    agent_id: string,
    weakness_type: string
): Promise<{ improvement_id: string; before_score: number; scenarios_analyzed: number }> => {
    const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', agent_id)
        .single()

    if (!agent) throw new Error('Agent not found')

    const { data: evaluations } = await supabaseAdmin
        .from('evaluations')
        .select('*, scenarios!inner(name, type, messages, expected_behavior, agent_id)')
        .eq('scenarios.agent_id', agent_id)
        .eq('scenarios.type', weakness_type)
        .order('created_at', { ascending: false })
        .limit(30)

    if (!evaluations || evaluations.length === 0) {
        throw new Error(`No scenarios found for weakness type: ${weakness_type}`)
    }

    const failed = evaluations.filter(e => !e.passed)
    const before_score = evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length

    const failureDetails = failed.slice(0, 8).map(e => {
        const raw = e.raw_response as any
        const scenario = e.scenarios as any
        return {
            scenario_name: scenario?.name,
            user_message: scenario?.messages?.[0]?.content?.slice(0, 200),
            agent_response: (e.agent_response || '').slice(0, 200),
            failure_reason: e.failure_reason,
            weaknesses: (raw?.weaknesses || raw?.judge?.weaknesses || []).slice(0, 2)
        }
    })

    const prompt = `You are a security and prompt engineering expert. This AI agent is WEAK specifically against "${weakness_type}" scenarios, scoring only ${(before_score * 100).toFixed(0)}%.

AGENT: ${agent.name}
CURRENT PROMPT:
"""
${(agent.system_prompt || '').slice(0, 600)}
"""

FAILED ${weakness_type.toUpperCase()} EXAMPLES:
${JSON.stringify(failureDetails, null, 2)}

Generate an improved system prompt that SPECIFICALLY strengthens the agent against "${weakness_type}" scenarios while keeping all other behaviors intact. Be very specific about defense mechanisms.

Return ONLY JSON, no markdown, no newlines inside string values:
{"suggested_prompt":"complete improved prompt","key_changes":["change1","change2","change3"],"explanation":"brief explanation of the defense strategy"}`

    const providers = [
        { provider: 'groq' as const, model: 'meta-llama/llama-4-scout-17b-16e-instruct' },
        { provider: 'openrouter' as const, model: 'meta-llama/llama-3.3-70b-instruct' },
        { provider: 'gemini' as const, model: 'gemini-2.5-flash' }
    ]

    let suggestion: any = null

    for (const { provider, model } of providers) {
        try {
            const res = await callAI({
                provider, model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 2000
            })

            const content = res.content
                .replace(/[\x00-\x1F\x7F]/g, ' ')
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim()

            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (!jsonMatch) continue

            try {
                suggestion = JSON.parse(jsonMatch[0])
                if (suggestion?.suggested_prompt) break
            } catch { continue }
        } catch {
            continue
        }
    }

    if (!suggestion) throw new Error('Failed to generate targeted improvement')

    const { data: inserted, error } = await supabaseAdmin
        .from('targeted_improvements')
        .insert({
            agent_id,
            weakness_type,
            before_score,
            original_prompt: agent.system_prompt,
            suggested_prompt: suggestion.suggested_prompt,
            scenarios_analyzed: evaluations.length,
            applied: false
        })
        .select()
        .single()

    if (error || !inserted) throw new Error('Failed to save improvement')

    return {
        improvement_id: inserted.id,
        before_score,
        scenarios_analyzed: evaluations.length
    }
}

export const applyTargetedImprovement = async (improvement_id: string): Promise<void> => {
    const { data: improvement } = await supabaseAdmin
        .from('targeted_improvements')
        .select('*')
        .eq('id', improvement_id)
        .single()

    if (!improvement) throw new Error('Improvement not found')

    await supabaseAdmin
        .from('agents')
        .update({ system_prompt: improvement.suggested_prompt })
        .eq('id', improvement.agent_id)

    const { data: versions } = await supabaseAdmin
        .from('prompt_versions')
        .select('version_number')
        .eq('agent_id', improvement.agent_id)
        .order('version_number', { ascending: false })
        .limit(1)

    const next_version = (versions?.[0]?.version_number || 0) + 1

    await supabaseAdmin.from('prompt_versions').insert({
        agent_id: improvement.agent_id,
        version_number: next_version,
        system_prompt: improvement.suggested_prompt,
        improvements_applied: [`Targeted fix for ${improvement.weakness_type} weakness`]
    })

    await supabaseAdmin
        .from('targeted_improvements')
        .update({ applied: true })
        .eq('id', improvement_id)
}

export const verifyImprovement = async (improvement_id: string): Promise<{ before: number; after: number; change: number }> => {
    const { data: improvement } = await supabaseAdmin
        .from('targeted_improvements')
        .select('*')
        .eq('id', improvement_id)
        .single()

    if (!improvement) throw new Error('Improvement not found')

    const { data: evaluations } = await supabaseAdmin
        .from('evaluations')
        .select('*, scenarios!inner(type, agent_id)')
        .eq('scenarios.agent_id', improvement.agent_id)
        .eq('scenarios.type', improvement.weakness_type)
        .order('created_at', { ascending: false })
        .limit(10)

    if (!evaluations || evaluations.length === 0) {
        return { before: improvement.before_score, after: 0, change: 0 }
    }

    const after_score = evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length

    await supabaseAdmin
        .from('targeted_improvements')
        .update({ after_score })
        .eq('id', improvement_id)

    return {
        before: improvement.before_score,
        after: after_score,
        change: after_score - improvement.before_score
    }
}

export const getImprovements = async (agent_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('targeted_improvements')
        .select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
}