import { supabaseAdmin } from '../lib/supabase'
import { executeRun } from './execution-engine'

export const runRegressionSuite = async (
    agent_id: string,
    regression_id: string
): Promise<void> => {
    try {
        const { data: benchmarks } = await supabaseAdmin
            .from('benchmarks')
            .select('id, name, domain, passing_threshold')
            .eq('is_official', true)

        if (!benchmarks || benchmarks.length === 0) {
            await supabaseAdmin.from('regression_runs').update({
                status: 'completed',
                results: [],
                completed_at: new Date().toISOString()
            }).eq('id', regression_id)
            return
        }

        const { data: agent } = await supabaseAdmin
            .from('agents').select('project_id').eq('id', agent_id).single()

        if (!agent) throw new Error('Agent not found')

        const results: any[] = []
        let has_regression = false

        for (const benchmark of benchmarks) {
            try {
                const { data: allScenarios } = await supabaseAdmin
                    .from('benchmark_scenarios')
                    .select('*')
                    .eq('benchmark_id', benchmark.id)
                    .limit(5)

                if (!allScenarios || allScenarios.length === 0) {
                    results.push({
                        benchmark_id: benchmark.id,
                        benchmark_name: benchmark.name,
                        domain: benchmark.domain,
                        status: 'skipped',
                        current_score: null,
                        previous_score: null,
                        score_change: null,
                        is_regression: false,
                        passed_threshold: false
                    })
                    continue
                }

                const scenariosToInsert = allScenarios.map((bs: any) => ({
                    name: bs.name,
                    type: bs.type,
                    persona: bs.description,
                    messages: bs.messages,
                    expected_behavior: (bs.expected_behaviors || []).join('. '),
                    agent_id
                }))

                const { data: insertedScenarios, error: scenariosError } = await supabaseAdmin
                    .from('scenarios')
                    .insert(scenariosToInsert)
                    .select()

                if (scenariosError || !insertedScenarios) {
                    throw new Error('Failed to create scenarios')
                }

                const { data: run, error: runError } = await supabaseAdmin
                    .from('runs')
                    .insert({
                        agent_id,
                        project_id: agent.project_id,
                        status: 'pending',
                        total_scenarios: insertedScenarios.length,
                        completed_scenarios: 0
                    })
                    .select()
                    .single()

                if (runError || !run) throw new Error('Failed to create run')

                await executeRun(run.id, agent_id, insertedScenarios.map((s: any) => s.id))

                const { data: runResult } = await supabaseAdmin
                    .from('runs')
                    .select('status, overall_score')
                    .eq('id', run.id)
                    .single()

                const { data: previous } = await supabaseAdmin
                    .from('leaderboard')
                    .select('overall_score')
                    .eq('benchmark_id', benchmark.id)
                    .eq('agent_id', agent_id)
                    .order('created_at', { ascending: false })
                    .limit(2)

                const current_score = runResult?.overall_score || 0
                const previous_score = previous && previous.length > 1 ? previous[1]?.overall_score : previous?.[0]?.overall_score || null
                const score_change = previous_score !== null ? current_score - previous_score : null
                const is_regression = score_change !== null && score_change < -0.05

                if (is_regression) has_regression = true

                results.push({
                    benchmark_id: benchmark.id,
                    benchmark_name: benchmark.name,
                    domain: benchmark.domain,
                    run_id: run.id,
                    current_score,
                    previous_score,
                    score_change,
                    is_regression,
                    passed_threshold: current_score >= (benchmark.passing_threshold || 0.7),
                    status: runResult?.status || 'completed',
                    sample_size: insertedScenarios.length
                })

                await supabaseAdmin.from('regression_runs').update({ results })
                    .eq('id', regression_id)

            } catch (err) {
                results.push({
                    benchmark_id: benchmark.id,
                    benchmark_name: benchmark.name,
                    domain: benchmark.domain,
                    status: 'error',
                    error: err instanceof Error ? err.message : 'Unknown error',
                    current_score: null,
                    previous_score: null,
                    score_change: null,
                    is_regression: false,
                    passed_threshold: false
                })
            }
        }

        await supabaseAdmin.from('regression_runs').update({
            status: 'completed',
            results,
            overall_regression: has_regression,
            completed_at: new Date().toISOString()
        }).eq('id', regression_id)

    } catch (err) {
        console.error('Regression suite failed:', err)
        await supabaseAdmin.from('regression_runs').update({
            status: 'failed',
            completed_at: new Date().toISOString()
        }).eq('id', regression_id)
    }
}

export const stopRegressionRun = async (id: string): Promise<void> => {
    await supabaseAdmin.from('regression_runs').update({
        status: 'failed',
        completed_at: new Date().toISOString()
    }).eq('id', id)
}

export const getRegressionRuns = async (agent_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('regression_runs').select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(10)
    if (error) throw new Error(error.message)
    return data || []
}

export const getRegressionRun = async (id: string) => {
    const { data, error } = await supabaseAdmin
        .from('regression_runs').select('*').eq('id', id).single()
    if (error || !data) throw new Error('Regression run not found')
    return data
}