import { supabaseAdmin } from '../lib/supabase'

const getCertLevel = (score: number): string => {
    if (score >= 95) return 'platinum'
    if (score >= 85) return 'gold'
    if (score >= 70) return 'silver'
    if (score >= 50) return 'bronze'
    return 'none'
}

export const issueCertification = async (agent_id: string) => {
    const { data: scores } = await supabaseAdmin
        .from('historical_scores').select('*')
        .eq('agent_id', agent_id)
        .order('recorded_at', { ascending: false }).limit(10)

    if (!scores || scores.length < 3) throw new Error('Need at least 3 benchmark runs for certification')

    const avg_score = scores.reduce((s, r) => s + (r.overall_score || 0), 0) / scores.length
    const reliability = Math.min(avg_score * 100, 100)
    const level = getCertLevel(reliability)

    if (level === 'none') throw new Error(`Score ${reliability.toFixed(1)}% is below minimum (50%) for certification`)

    const { data: benchmarks } = await supabaseAdmin
        .from('leaderboard').select('*, benchmarks(name)')
        .eq('agent_id', agent_id).order('overall_score', { ascending: false })

    const valid_until = new Date()
    valid_until.setMonth(valid_until.getMonth() + 6)

    const { data: existing } = await supabaseAdmin
        .from('agent_certifications').select('id, share_token')
        .eq('agent_id', agent_id).maybeSingle()

    const certData = {
        agent_id,
        level,
        reliability_score: reliability,
        issued_at: new Date().toISOString(),
        valid_until: valid_until.toISOString(),
        benchmarks_passed: benchmarks?.map(b => ({ name: (b.benchmarks as any)?.name, score: b.overall_score })) || [],
        is_public: true
    }

    if (existing) {
        await supabaseAdmin.from('agent_certifications').update(certData).eq('id', existing.id)
        return { ...certData, share_token: existing.share_token, id: existing.id }
    }

    const { data: cert } = await supabaseAdmin.from('agent_certifications').insert(certData).select().single()
    return cert
}

export const getCertification = async (agent_id: string) => {
    const { data } = await supabaseAdmin
        .from('agent_certifications').select('*')
        .eq('agent_id', agent_id).maybeSingle()
    return data
}

export const getPublicCertification = async (share_token: string) => {
    const { data } = await supabaseAdmin
        .from('agent_certifications').select('*, agents(name, type, model)')
        .eq('share_token', share_token).eq('is_public', true).maybeSingle()
    return data
}