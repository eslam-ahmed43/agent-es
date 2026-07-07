import { supabaseAdmin } from '../lib/supabase'
import { seedOfficialBenchmarks } from '../lib/benchmark/seeds'
import { executeRun } from './execution-engine'
import { updateLeaderboard } from './leaderboard.service'
import { recordHistoricalScore } from './analytics.service'


export const initializeBenchmarks = async (): Promise<void> => {
    await seedOfficialBenchmarks()
}

export const getBenchmarks = async (agent_type?: string) => {
    let query = supabaseAdmin
        .from('benchmarks')
        .select('*, benchmark_scenarios(count)')
        .order('is_official', { ascending: false })
        .order('created_at', { ascending: false })

    if (agent_type) query = query.eq('agent_type', agent_type)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data || []
}

export const getBenchmark = async (id: string) => {
    const { data, error } = await supabaseAdmin
        .from('benchmarks')
        .select('*, benchmark_scenarios(*)')
        .eq('id', id)
        .single()

    if (error || !data) throw new Error('Benchmark not found')
    return data
}

export const runBenchmark = async (benchmark_id: string, agent_id: string, project_id: string): Promise<string> => {
    const benchmark = await getBenchmark(benchmark_id)

    const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', agent_id)
        .single()

    if (!agent) throw new Error('Agent not found')

    const scenariosToInsert = benchmark.benchmark_scenarios.map((bs: any) => ({
        name: bs.name,
        type: bs.type,
        persona: bs.description,
        messages: bs.messages,
        expected_behavior: bs.expected_behaviors.join('. '),
        agent_id
    }))

    const { data: insertedScenarios, error: scenariosError } = await supabaseAdmin
        .from('scenarios')
        .insert(scenariosToInsert)
        .select()

    if (scenariosError || !insertedScenarios) throw new Error('Failed to create scenarios')

    const { data: run, error: runError } = await supabaseAdmin
        .from('runs')
        .insert({
            agent_id,
            project_id,
            status: 'pending',
            total_scenarios: insertedScenarios.length,
            completed_scenarios: 0
        })
        .select()
        .single()

    if (runError || !run) throw new Error('Failed to create run')

    executeRun(run.id, agent_id, insertedScenarios.map((s: any) => s.id))
        .then(async () => {
            const { data: evaluations } = await supabaseAdmin
                .from('evaluations')
                .select('overall_score, passed')
                .eq('run_id', run.id)

            if (evaluations) {
                const overall_score = evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length
                const passed = overall_score >= (benchmark.passing_threshold || 0.7)

                const scores: Record<string, number> = {}
                evaluations.forEach((e: any, i: number) => { scores[`scenario_${i}`] = e.overall_score || 0 })

                await supabaseAdmin.from('benchmark_results').insert({
                    benchmark_id, agent_id, run_id: run.id,
                    overall_score, passed, scores
                })

                await updateLeaderboard(benchmark_id, agent_id, run.id)
                await updateLeaderboard(benchmark_id, agent_id, run.id)
                await recordHistoricalScore(agent_id, benchmark_id, run.id)
            }
        })
        .catch(err => console.error('Benchmark run failed:', err))

    return run.id
}

export const getBenchmarkResults = async (benchmark_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('benchmark_results')
        .select('*, agents(name, model, type)')
        .eq('benchmark_id', benchmark_id)
        .order('overall_score', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
}