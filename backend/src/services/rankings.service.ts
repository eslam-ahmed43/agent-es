import { supabaseAdmin } from '../lib/supabase'

const getWeekBounds = (): { start: string; end: string } => {
    const now = new Date()
    const day = now.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - diffToMonday)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) }
}

export const computeWeeklyRankings = async (): Promise<void> => {
    const { start, end } = getWeekBounds()

    const { data: leaderboardEntries } = await supabaseAdmin
        .from('leaderboard')
        .select('benchmark_id, agent_id, overall_score, created_at')
        .order('created_at', { ascending: false })

    if (!leaderboardEntries || leaderboardEntries.length === 0) return

    const byBenchmark: Record<string, { agent_id: string; overall_score: number }[]> = {}

    for (const entry of leaderboardEntries) {
        if (!byBenchmark[entry.benchmark_id]) byBenchmark[entry.benchmark_id] = []
        const exists = byBenchmark[entry.benchmark_id].find(e => e.agent_id === entry.agent_id)
        if (!exists) byBenchmark[entry.benchmark_id].push({ agent_id: entry.agent_id, overall_score: entry.overall_score })
    }

    await supabaseAdmin.from('weekly_rankings').delete().eq('week_start', start)

    for (const [benchmark_id, agents] of Object.entries(byBenchmark)) {
        const sorted = agents.sort((a, b) => b.overall_score - a.overall_score)

        const rows = sorted.map((a, idx) => ({
            benchmark_id,
            agent_id: a.agent_id,
            rank: idx + 1,
            overall_score: a.overall_score,
            attack_score: null,
            week_start: start,
            week_end: end
        }))

        if (rows.length > 0) {
            await supabaseAdmin.from('weekly_rankings').insert(rows)
        }
    }
}

export const getCurrentWeekRankings = async () => {
    const { start } = getWeekBounds()

    const { data, error } = await supabaseAdmin
        .from('weekly_rankings')
        .select('*, agents(name, model, type), benchmarks(name, domain)')
        .eq('week_start', start)
        .order('rank', { ascending: true })

    if (error) throw new Error(error.message)

    const grouped: Record<string, any[]> = {}
    for (const row of data || []) {
        const benchName = (row.benchmarks as any)?.name || 'Unknown'
        if (!grouped[benchName]) grouped[benchName] = []
        grouped[benchName].push(row)
    }

    return { week_start: start, rankings: grouped }
}

export const getTopAgentOfWeek = async () => {
    const { start } = getWeekBounds()

    const { data, error } = await supabaseAdmin
        .from('weekly_rankings')
        .select('*, agents(name, model, type), benchmarks(name, domain)')
        .eq('week_start', start)
        .eq('rank', 1)
        .order('overall_score', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) throw new Error(error.message)
    return data
}