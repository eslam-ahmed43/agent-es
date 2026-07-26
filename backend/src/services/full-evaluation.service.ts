import { supabaseAdmin } from '../lib/supabase'
import { executeRun } from './execution-engine'
import { callGeneration } from '../lib/ai-router'

const generateAgentProfile = async (
    agent_name: string,
    benchmark_results: { name: string; domain: string; score: number; passed: number; failed: number }[]
): Promise<{ strengths: string[]; weaknesses: string[]; recommendation: string; profile: Record<string, any> }> => {
    const resultsText = benchmark_results.map(r =>
        `${r.name} (${r.domain}): ${(r.score * 100).toFixed(1)}% — ${r.passed} passed, ${r.failed} failed`
    ).join('\n')

    const prompt = `You are an AI Agent analyst. Analyze these benchmark results for "${agent_name}" and provide insights.

BENCHMARK RESULTS:
${resultsText}

Return ONLY valid JSON:
{
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "recommendation": "One sentence: This agent is best suited for...",
  "profile": {
    "best_use_case": "...",
    "reliability_tier": "enterprise|professional|experimental",
    "key_capability": "...",
    "main_risk": "..."
  }
}`

    try {
        const res = await callGeneration({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 600
        })
        const clean = res.content.replace(/```json/g, '').replace(/```/g, '').trim()
        const match = clean.match(/\{[\s\S]*\}/)
        if (match) return JSON.parse(match[0])
    } catch (err) {
        console.error('Profile generation failed:', err)
    }

    return {
        strengths: ['Completed full evaluation'],
        weaknesses: ['Analysis unavailable'],
        recommendation: 'Review benchmark results for detailed insights.',
        profile: { best_use_case: 'General', reliability_tier: 'experimental', key_capability: 'Unknown', main_risk: 'Unknown' }
    }
}

export const startFullEvaluation = async (agent_id: string): Promise<string> => {
    const { data: agent } = await supabaseAdmin
        .from('agents').select('*').eq('id', agent_id).single()
    if (!agent) throw new Error('Agent not found')

    const { data: benchmarks } = await supabaseAdmin
        .from('benchmarks').select('*').order('created_at', { ascending: true })
    if (!benchmarks || benchmarks.length === 0) throw new Error('No benchmarks found')

    const { data: evaluation, error } = await supabaseAdmin
        .from('full_evaluations').insert({
            agent_id,
            status: 'running',
            benchmark_results: [],
            overall_score: 0,
            profile: {},
            strengths: [],
            weaknesses: [],
            recommendation: ''
        }).select().single()

    if (error || !evaluation) throw new Error('Failed to create evaluation')

    runFullEvaluation(evaluation.id, agent_id, agent, benchmarks).catch(err => {
        console.error('Full evaluation failed:', err)
        supabaseAdmin.from('full_evaluations').update({ status: 'failed' }).eq('id', evaluation.id)
    })

    return evaluation.id
}

const runFullEvaluation = async (
    evaluation_id: string,
    agent_id: string,
    agent: any,
    benchmarks: any[]
) => {
    const benchmark_results: any[] = []

    for (const benchmark of benchmarks) {
        const { data: benchmarkScenarios } = await supabaseAdmin
            .from('benchmark_scenarios')
            .select('scenario_id')
            .eq('benchmark_id', benchmark.id)

        if (!benchmarkScenarios || benchmarkScenarios.length === 0) continue

        const scenario_ids = benchmarkScenarios.map(bs => bs.scenario_id)

        const { data: run } = await supabaseAdmin.from('runs').insert({
            agent_id,
            project_id: agent.project_id,
            status: 'pending',
            total_scenarios: scenario_ids.length,
            completed_scenarios: 0
        }).select().single()

        if (!run) continue

        await executeRun(run.id, agent_id, scenario_ids)

        const { data: completedRun } = await supabaseAdmin
            .from('runs').select('overall_score, completed_scenarios').eq('id', run.id).single()

        const { data: evaluations } = await supabaseAdmin
            .from('evaluations').select('passed').eq('run_id', run.id)

        const passed = evaluations?.filter(e => e.passed).length || 0
        const failed = (evaluations?.length || 0) - passed

        benchmark_results.push({
            benchmark_id: benchmark.id,
            name: benchmark.name,
            domain: benchmark.domain,
            score: completedRun?.overall_score || 0,
            passed,
            failed,
            total: scenario_ids.length,
            run_id: run.id
        })

        await supabaseAdmin.from('full_evaluations').update({
            benchmark_results
        }).eq('id', evaluation_id)
    }

    const overall_score = benchmark_results.length > 0
        ? benchmark_results.reduce((s, r) => s + r.score, 0) / benchmark_results.length
        : 0

    const profile = await generateAgentProfile(agent.name, benchmark_results)

    await supabaseAdmin.from('full_evaluations').update({
        status: 'completed',
        benchmark_results,
        overall_score,
        strengths: profile.strengths,
        weaknesses: profile.weaknesses,
        recommendation: profile.recommendation,
        profile: profile.profile,
        completed_at: new Date().toISOString()
    }).eq('id', evaluation_id)
}

export const getFullEvaluation = async (evaluation_id: string) => {
    const { data } = await supabaseAdmin
        .from('full_evaluations').select('*').eq('id', evaluation_id).single()
    return data
}

export const getAgentEvaluations = async (agent_id: string) => {
    const { data } = await supabaseAdmin
        .from('full_evaluations').select('*').eq('agent_id', agent_id)
        .order('created_at', { ascending: false }).limit(5)
    return data || []
}