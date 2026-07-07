import { supabaseAdmin } from '../lib/supabase'

export const recordHistoricalScore = async (
    agent_id: string,
    benchmark_id: string,
    run_id: string
): Promise<void> => {
    const { data: evaluations } = await supabaseAdmin
        .from('evaluations')
        .select('overall_score, safety_score, relevance_score, passed, raw_response')
        .eq('run_id', run_id)

    if (!evaluations || evaluations.length === 0) return

    const avg = (key: string) => {
        const vals = evaluations.map((e: any) => e[key] || 0).filter((v: number) => v > 0)
        return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0
    }

    const consistency_vals = evaluations.map((e: any) => {
        const raw = e.raw_response as any
        return raw?.judge?.consistency || raw?.consistency || 0
    }).filter((v: number) => v > 0)

    const helpfulness_vals = evaluations.map((e: any) => {
        const raw = e.raw_response as any
        return raw?.judge?.helpfulness || raw?.helpfulness || 0
    }).filter((v: number) => v > 0)

    const consistency_avg = consistency_vals.length > 0
        ? consistency_vals.reduce((a: number, b: number) => a + b, 0) / consistency_vals.length : 0

    const helpfulness_avg = helpfulness_vals.length > 0
        ? helpfulness_vals.reduce((a: number, b: number) => a + b, 0) / helpfulness_vals.length : 0

    const { data: versions } = await supabaseAdmin
        .from('prompt_versions')
        .select('version_number')
        .eq('agent_id', agent_id)
        .order('version_number', { ascending: false })
        .limit(1)

    const prompt_version = versions?.[0]?.version_number || 1

    await supabaseAdmin.from('historical_scores').insert({
        agent_id,
        benchmark_id,
        run_id,
        overall_score: avg('overall_score'),
        safety_score: avg('safety_score'),
        relevance_score: avg('relevance_score'),
        consistency_score: consistency_avg,
        helpfulness_score: helpfulness_avg,
        passed_count: evaluations.filter(e => e.passed).length,
        failed_count: evaluations.filter(e => !e.passed).length,
        prompt_version,
        recorded_at: new Date().toISOString()
    })
}

export const getHistoricalScores = async (agent_id: string, benchmark_id?: string) => {
    let query = supabaseAdmin
        .from('historical_scores')
        .select('*, benchmarks(name, domain)')
        .eq('agent_id', agent_id)
        .order('recorded_at', { ascending: true })

    if (benchmark_id) query = query.eq('benchmark_id', benchmark_id)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data || []
}

export const getReliabilityScore = async (agent_id: string) => {
    const { data: recent } = await supabaseAdmin
        .from('historical_scores')
        .select('*')
        .eq('agent_id', agent_id)
        .order('recorded_at', { ascending: false })
        .limit(20)

    if (!recent || recent.length === 0) return null

    const avg = (key: string) => {
        const vals = recent.map((r: any) => r[key] || 0).filter((v: number) => v > 0)
        return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0
    }

    const overall = avg('overall_score')
    const safety = avg('safety_score')
    const relevance = avg('relevance_score')
    const consistency = avg('consistency_score')
    const helpfulness = avg('helpfulness_score')

    const scores = recent.map((r: any) => r.overall_score || 0)
    const mean = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
    const variance = scores.reduce((sum: number, s: number) => sum + Math.pow(s - mean, 2), 0) / scores.length
    const stability = Math.max(0, 1 - Math.sqrt(variance))

    const passed_total = recent.reduce((sum: number, r: any) => sum + (r.passed_count || 0), 0)
    const total = recent.reduce((sum: number, r: any) => sum + (r.passed_count || 0) + (r.failed_count || 0), 0)
    const pass_rate = total > 0 ? passed_total / total : 0

    const reliability = (overall * 0.3 + safety * 0.2 + consistency * 0.15 + helpfulness * 0.15 + stability * 0.1 + pass_rate * 0.1)

    const confidence = recent.length >= 10 ? 'High' : recent.length >= 5 ? 'Medium' : 'Low'

    return {
        reliability_score: parseFloat((reliability * 100).toFixed(1)),
        overall: parseFloat((overall * 100).toFixed(1)),
        safety: parseFloat((safety * 100).toFixed(1)),
        relevance: parseFloat((relevance * 100).toFixed(1)),
        consistency: parseFloat((consistency * 100).toFixed(1)),
        helpfulness: parseFloat((helpfulness * 100).toFixed(1)),
        stability: parseFloat((stability * 100).toFixed(1)),
        pass_rate: parseFloat((pass_rate * 100).toFixed(1)),
        confidence,
        runs_analyzed: recent.length
    }
}

export const getPerformanceAnalytics = async (agent_id: string) => {
    const { data: evaluations } = await supabaseAdmin
        .from('evaluations')
        .select('*, scenarios(type, name)')
        .eq('scenarios.agent_id', agent_id)
        .not('scenarios', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)

    if (!evaluations || evaluations.length === 0) return null

    const byType: Record<string, { scores: number[]; passed: number; total: number }> = {}

    for (const ev of evaluations) {
        const type = (ev.scenarios as any)?.type || 'unknown'
        if (!byType[type]) byType[type] = { scores: [], passed: 0, total: 0 }
        byType[type].scores.push(ev.overall_score || 0)
        byType[type].total++
        if (ev.passed) byType[type].passed++
    }

    const type_performance = Object.entries(byType).map(([type, data]) => ({
        type,
        avg_score: parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length * 100).toFixed(1)),
        pass_rate: parseFloat((data.passed / data.total * 100).toFixed(1)),
        total: data.total
    })).sort((a, b) => b.avg_score - a.avg_score)

    const strengths = type_performance.filter(t => t.avg_score >= 80)
    const weaknesses = type_performance.filter(t => t.avg_score < 70)

    return { type_performance, strengths, weaknesses }
}