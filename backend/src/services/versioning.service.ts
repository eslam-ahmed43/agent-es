import { supabaseAdmin } from '../lib/supabase'

export const enrichVersionFromRun = async (version_id: string, run_id: string): Promise<void> => {
    const { data: evaluations } = await supabaseAdmin
        .from('evaluations')
        .select('*, scenarios(type)')
        .eq('run_id', run_id)

    if (!evaluations || evaluations.length === 0) return

    const overall = evaluations.reduce((s, e) => s + (e.overall_score || 0), 0) / evaluations.length
    const safety = evaluations.reduce((s, e) => s + (e.safety_score || 0), 0) / evaluations.length

    const attackEvals = evaluations.filter(e => (e.scenarios as any)?.type === 'attack')
    const attack_score = attackEvals.length > 0
        ? attackEvals.reduce((s, e) => s + (e.overall_score || 0), 0) / attackEvals.length
        : null

    const { data: traces } = await supabaseAdmin
        .from('execution_traces')
        .select('latency')
        .in('evaluation_id', evaluations.map(e => e.id))

    const latencies = (traces || []).map(t => t.latency).filter(l => l && l > 0)
    const latency_avg = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : null

    await supabaseAdmin
        .from('prompt_versions')
        .update({ overall_score: overall, safety_score: safety, attack_score, latency_avg, run_id })
        .eq('id', version_id)
}

export const enrichVersionScores = async (version_id: string): Promise<{ enriched: boolean; reason?: string }> => {
    const { data: version } = await supabaseAdmin
        .from('prompt_versions')
        .select('*')
        .eq('id', version_id)
        .single()

    if (!version) return { enriched: false, reason: 'Version not found' }

    const { data: nextRun } = await supabaseAdmin
        .from('runs')
        .select('id')
        .eq('agent_id', version.agent_id)
        .eq('status', 'completed')
        .gt('created_at', version.created_at)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    if (!nextRun) {
        return { enriched: false, reason: 'No completed run found after this version was created — run a benchmark first.' }
    }

    await enrichVersionFromRun(version_id, nextRun.id)
    return { enriched: true }
}

export const getVersionsWithScores = async (agent_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('prompt_versions')
        .select('*')
        .eq('agent_id', agent_id)
        .order('version_number', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
}

export const compareVersions = async (version_a_id: string, version_b_id: string) => {
    const { data: versions } = await supabaseAdmin
        .from('prompt_versions')
        .select('*')
        .in('id', [version_a_id, version_b_id])

    if (!versions || versions.length !== 2) throw new Error('One or both versions not found')

    const a = versions.find(v => v.id === version_a_id)
    const b = versions.find(v => v.id === version_b_id)

    if (!a || !b) throw new Error('Versions not found')

    const diff = (key: string) => {
        const valA = (a as any)[key]
        const valB = (b as any)[key]
        if (valA === null || valB === null || valA === undefined || valB === undefined) return null
        return valB - valA
    }

    return {
        version_a: a,
        version_b: b,
        diff: {
            overall_score: diff('overall_score'),
            safety_score: diff('safety_score'),
            attack_score: diff('attack_score'),
            latency_avg: diff('latency_avg')
        }
    }
}

export const rollbackToVersion = async (agent_id: string, version_id: string): Promise<void> => {
    const { data: version } = await supabaseAdmin
        .from('prompt_versions')
        .select('system_prompt, version_number')
        .eq('id', version_id)
        .single()

    if (!version) throw new Error('Version not found')

    const { data: current } = await supabaseAdmin
        .from('agents')
        .select('system_prompt')
        .eq('id', agent_id)
        .single()

    if (current?.system_prompt === version.system_prompt) {
        throw new Error('This is already the active prompt — nothing to roll back.')
    }

    await supabaseAdmin
        .from('agents')
        .update({ system_prompt: version.system_prompt })
        .eq('id', agent_id)

    const { data: existingDuplicate } = await supabaseAdmin
        .from('prompt_versions')
        .select('id')
        .eq('agent_id', agent_id)
        .eq('system_prompt', version.system_prompt)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (existingDuplicate) return

    const { data: latest } = await supabaseAdmin
        .from('prompt_versions')
        .select('version_number')
        .eq('agent_id', agent_id)
        .order('version_number', { ascending: false })
        .limit(1)

    const next_version = (latest?.[0]?.version_number || 0) + 1

    await supabaseAdmin.from('prompt_versions').insert({
        agent_id,
        version_number: next_version,
        system_prompt: version.system_prompt,
        improvements_applied: [`Rolled back to v${version.version_number}`]
    })
}