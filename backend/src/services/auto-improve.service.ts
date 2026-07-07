import { supabaseAdmin } from '../lib/supabase'
import { callAI } from '../lib/ai-router'

export const analyzeAndSuggestImprovement = async (
    agent_id: string,
    run_id: string
): Promise<string> => {
    const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', agent_id)
        .single()

    if (!agent) throw new Error('Agent not found')

    const { data: evaluations } = await supabaseAdmin
        .from('evaluations')
        .select('*, scenarios(name, type, messages, expected_behavior)')
        .eq('run_id', run_id)
        .limit(50)

    if (!evaluations || evaluations.length === 0) throw new Error('No evaluations found')

    const failed = evaluations.filter(e => !e.passed)
    const passed = evaluations.filter(e => e.passed)
    const avg_score = evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length

    const failureAnalysis = failed.slice(0, 5).map(e => {
        const raw = e.raw_response as any
        return {
            scenario: (e.scenarios as any)?.name || 'Unknown',
            type: (e.scenarios as any)?.type || 'Unknown',
            score: e.overall_score,
            failure_reason: e.failure_reason,
            weaknesses: (raw?.weaknesses || raw?.judge?.weaknesses || []).slice(0, 2),
            suggestions: (raw?.suggestions || raw?.judge?.suggestions || []).slice(0, 2)
        }
    })

    const prompt = `You are an expert AI Prompt Engineer. Improve this agent's system prompt.

AGENT: ${agent.name} (${agent.domain || 'general'})

CURRENT PROMPT:
"""
${agent.system_prompt?.slice(0, 500)}
"""

SCORE: ${(avg_score * 100).toFixed(1)}% (${passed.length} passed, ${failed.length} failed)

TOP FAILURES:
${failureAnalysis.slice(0, 5).map(f => `- ${f.scenario}: ${f.failure_reason || f.weaknesses[0] || 'Unknown'}`).join('\n')}

Generate an improved system prompt. Return ONLY JSON with no newlines inside string values:
{"suggested_prompt":"complete improved prompt here","weaknesses_addressed":["weakness1","weakness2"],"expected_improvement":0.1,"explanation":"brief explanation"}`

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

            const jsonMatch = content.match(/\{[\s\S]*?\}(?=\s*$)/) || content.match(/\{[\s\S]*\}/)
            if (!jsonMatch) continue

            try {
                suggestion = JSON.parse(jsonMatch[0])
                if (suggestion?.suggested_prompt) break
            } catch { continue }

        } catch (err) {
            console.error(`Provider ${provider} failed:`, err)
            continue
        }
    }

    if (!suggestion) throw new Error('Failed to generate improvement suggestion')

    const { data: inserted, error } = await supabaseAdmin
        .from('improvement_suggestions')
        .insert({
            agent_id,
            run_id,
            original_prompt: agent.system_prompt,
            suggested_prompt: suggestion.suggested_prompt,
            weaknesses_addressed: suggestion.weaknesses_addressed || [],
            expected_improvement: suggestion.expected_improvement || 0.1,
            applied: false
        })
        .select()
        .single()

    if (error || !inserted) throw new Error('Failed to save suggestion')

    await savePromptVersion(agent_id, agent.system_prompt, avg_score, run_id, [])

    return inserted.id
}

export const applySuggestion = async (suggestion_id: string): Promise<void> => {
    const { data: suggestion } = await supabaseAdmin
        .from('improvement_suggestions')
        .select('*')
        .eq('id', suggestion_id)
        .single()

    if (!suggestion) throw new Error('Suggestion not found')

    const { data: versions } = await supabaseAdmin
        .from('prompt_versions')
        .select('version_number')
        .eq('agent_id', suggestion.agent_id)
        .order('version_number', { ascending: false })
        .limit(1)

    const next_version = (versions?.[0]?.version_number || 0) + 1

    await supabaseAdmin
        .from('agents')
        .update({ system_prompt: suggestion.suggested_prompt })
        .eq('id', suggestion.agent_id)

    await supabaseAdmin
        .from('prompt_versions')
        .insert({
            agent_id: suggestion.agent_id,
            version_number: next_version,
            system_prompt: suggestion.suggested_prompt,
            improvements_applied: suggestion.weaknesses_addressed,
            run_id: suggestion.run_id
        })

    await supabaseAdmin
        .from('improvement_suggestions')
        .update({ applied: true })
        .eq('id', suggestion_id)
}

export const savePromptVersion = async (
    agent_id: string,
    system_prompt: string,
    score: number,
    run_id: string,
    improvements: string[]
): Promise<void> => {
    const { data: existing } = await supabaseAdmin
        .from('prompt_versions')
        .select('id')
        .eq('agent_id', agent_id)
        .eq('system_prompt', system_prompt)
        .maybeSingle()

    if (existing) return

    const { data: versions } = await supabaseAdmin
        .from('prompt_versions')
        .select('version_number')
        .eq('agent_id', agent_id)
        .order('version_number', { ascending: false })
        .limit(1)

    const next_version = (versions?.[0]?.version_number || 0) + 1

    await supabaseAdmin.from('prompt_versions').insert({
        agent_id,
        version_number: next_version,
        system_prompt,
        benchmark_score: score,
        run_id,
        improvements_applied: improvements
    })
}

export const getSuggestions = async (agent_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('improvement_suggestions')
        .select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
}

export const getPromptHistory = async (agent_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('prompt_versions')
        .select('*')
        .eq('agent_id', agent_id)
        .order('version_number', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
}