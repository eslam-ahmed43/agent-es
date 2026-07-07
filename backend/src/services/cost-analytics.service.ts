import { supabaseAdmin } from '../lib/supabase'

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
    'gemini-2.5-flash': { input: 0.00015, output: 0.0006 },
    'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
    'meta-llama/llama-4-scout-17b-16e-instruct': { input: 0.00011, output: 0.00034 },
    'meta-llama/llama-3.3-70b-instruct': { input: 0.00059, output: 0.00079 },
    'claude-sonnet-4.5': { input: 0.003, output: 0.015 },
    'default': { input: 0.0002, output: 0.0006 }
}

const estimateCost = (model: string, prompt_tokens: number, completion_tokens: number): number => {
    const pricing = MODEL_COSTS[model] || MODEL_COSTS['default']
    return (prompt_tokens / 1000 * pricing.input) + (completion_tokens / 1000 * pricing.output)
}

const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4)
}

export const computeRunCost = async (run_id: string): Promise<void> => {
    const { data: run } = await supabaseAdmin
        .from('runs')
        .select('*, agents(id, model)')
        .eq('id', run_id)
        .single()

    if (!run) return

    const { data: evaluations } = await supabaseAdmin
        .from('evaluations')
        .select('agent_response, raw_response, scenarios(messages, expected_behavior)')
        .eq('run_id', run_id)

    if (!evaluations || evaluations.length === 0) return

    let total_prompt_tokens = 0
    let total_completion_tokens = 0
    let total_latency = 0
    let latency_count = 0

    const model = (run.agents as any)?.model || 'default'

    for (const ev of evaluations) {
        const scenario = ev.scenarios as any
        const messages = scenario?.messages || []
        const expected = scenario?.expected_behavior || ''
        const response = ev.agent_response || ''

        const input_text = messages.map((m: any) => m.content).join(' ') + ' ' + expected
        const prompt_t = estimateTokens(input_text)
        const completion_t = estimateTokens(response)

        total_prompt_tokens += prompt_t
        total_completion_tokens += completion_t

        const raw = ev.raw_response as any
        if (raw?.response?.latency) {
            total_latency += raw.response.latency
            latency_count++
        }
    }

    const estimated_cost = estimateCost(model, total_prompt_tokens, total_completion_tokens)
    const avg_latency = latency_count > 0 ? total_latency / latency_count : 0

    const { data: existing } = await supabaseAdmin
        .from('cost_analytics')
        .select('id')
        .eq('run_id', run_id)
        .maybeSingle()

    if (existing) return

    await supabaseAdmin.from('cost_analytics').insert({
        agent_id: run.agent_id,
        run_id,
        total_tokens: total_prompt_tokens + total_completion_tokens,
        prompt_tokens: total_prompt_tokens,
        completion_tokens: total_completion_tokens,
        estimated_cost_usd: parseFloat(estimated_cost.toFixed(6)),
        avg_latency_ms: parseFloat(avg_latency.toFixed(2)),
        provider: 'mixed',
        model,
        scenario_count: evaluations.length,
        overall_score: run.overall_score,
        cost_per_scenario: evaluations.length > 0
            ? parseFloat((estimated_cost / evaluations.length).toFixed(6))
            : 0
    })
}

export const getCostAnalytics = async (agent_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('cost_analytics')
        .select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) throw new Error(error.message)
    return data || []
}

export const getCostSummary = async (agent_id: string) => {
    const { data } = await supabaseAdmin
        .from('cost_analytics')
        .select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(20)

    if (!data || data.length === 0) return null

    const total_cost = data.reduce((s, r) => s + (r.estimated_cost_usd || 0), 0)
    const total_tokens = data.reduce((s, r) => s + (r.total_tokens || 0), 0)
    const avg_latency = data.reduce((s, r) => s + (r.avg_latency_ms || 0), 0) / data.length
    const avg_cost_per_run = total_cost / data.length
    const avg_score = data.filter(r => r.overall_score).reduce((s, r) => s + (r.overall_score || 0), 0) /
        data.filter(r => r.overall_score).length

    const monthly_runs_estimate = 30
    const estimated_monthly_cost = avg_cost_per_run * monthly_runs_estimate

    return {
        total_runs: data.length,
        total_cost_usd: parseFloat(total_cost.toFixed(4)),
        total_tokens,
        avg_cost_per_run: parseFloat(avg_cost_per_run.toFixed(4)),
        avg_latency_ms: parseFloat(avg_latency.toFixed(2)),
        avg_score: avg_score ? parseFloat((avg_score * 100).toFixed(1)) : null,
        estimated_monthly_cost: parseFloat(estimated_monthly_cost.toFixed(2)),
        cost_efficiency: avg_score ? parseFloat((avg_score / (avg_cost_per_run * 1000 + 0.001)).toFixed(2)) : null
    }
}

export const computeAllRunsCost = async (agent_id: string): Promise<number> => {
    const { data: runs } = await supabaseAdmin
        .from('runs')
        .select('id')
        .eq('agent_id', agent_id)
        .eq('status', 'completed')

    if (!runs || runs.length === 0) return 0

    const { data: existing } = await supabaseAdmin
        .from('cost_analytics')
        .select('run_id')
        .eq('agent_id', agent_id)

    const existingRunIds = new Set(existing?.map(e => e.run_id) || [])
    const newRuns = runs.filter(r => !existingRunIds.has(r.id))

    for (const run of newRuns) {
        await computeRunCost(run.id)
    }

    return newRuns.length
}