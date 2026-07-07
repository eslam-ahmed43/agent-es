import { supabaseAdmin } from '../lib/supabase'

export const updateLeaderboard = async (
    benchmark_id: string,
    agent_id: string,
    run_id: string
): Promise<void> => {
    const { data: evaluations } = await supabaseAdmin
        .from('evaluations')
        .select('*')
        .eq('run_id', run_id)

    if (!evaluations || evaluations.length === 0) {
        console.error('No evaluations found for run:', run_id)
        return
    }

    const scores = { easy: [] as number[], medium: [] as number[], hard: [] as number[], expert: [] as number[] }
    let passed = 0
    let total_latency = 0
    let latency_count = 0

    for (const ev of evaluations) {
        const score = ev.overall_score || 0
        const raw = ev.raw_response as any
        const difficulty = raw?.difficulty || 'medium'

        if (scores[difficulty as keyof typeof scores]) {
            scores[difficulty as keyof typeof scores].push(score)
        } else {
            scores.medium.push(score)
        }

        if (ev.passed) passed++

        if (raw?.response?.latency) {
            total_latency += raw.response.latency
            latency_count++
        }
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null
    const overall = evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length

    const entry = {
        benchmark_id,
        agent_id,
        run_id,
        overall_score: overall,
        easy_score: avg(scores.easy),
        medium_score: avg(scores.medium),
        hard_score: avg(scores.hard),
        expert_score: avg(scores.expert),
        passed_count: passed,
        failed_count: evaluations.length - passed,
        total_count: evaluations.length,
        latency_avg: latency_count > 0 ? total_latency / latency_count : null
    }

    const { data: existing } = await supabaseAdmin
        .from('leaderboard')
        .select('id')
        .eq('benchmark_id', benchmark_id)
        .eq('agent_id', agent_id)
        .maybeSingle()

    if (existing) {
        await supabaseAdmin.from('leaderboard').update(entry).eq('id', existing.id)
    } else {
        const { error } = await supabaseAdmin.from('leaderboard').insert(entry)
        if (error) console.error('Leaderboard insert error:', error)
    }

    const { data: allEntries } = await supabaseAdmin
        .from('leaderboard')
        .select('id, overall_score')
        .eq('benchmark_id', benchmark_id)
        .order('overall_score', { ascending: false })

    if (allEntries) {
        for (let i = 0; i < allEntries.length; i++) {
            await supabaseAdmin
                .from('leaderboard')
                .update({ rank: i + 1 })
                .eq('id', allEntries[i].id)
        }
    }

    console.log(`Leaderboard updated for benchmark: ${benchmark_id}, agent: ${agent_id}`)
}

export const getLeaderboard = async (benchmark_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('leaderboard')
        .select('*, agents(name, model, type, description), benchmarks(name, domain)')
        .eq('benchmark_id', benchmark_id)
        .order('rank', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
}

export const getAllLeaderboards = async () => {
    const { data: benchmarks } = await supabaseAdmin
        .from('benchmarks')
        .select('id, name, domain, agent_type')
        .order('is_official', { ascending: false })

    if (!benchmarks) return []

    const results = []
    for (const benchmark of benchmarks) {
        const { data } = await supabaseAdmin
            .from('leaderboard')
            .select('*, agents(name, model, type)')
            .eq('benchmark_id', benchmark.id)
            .order('rank', { ascending: true })
            .limit(3)

        results.push({ benchmark, top_agents: data || [] })
    }

    return results
}