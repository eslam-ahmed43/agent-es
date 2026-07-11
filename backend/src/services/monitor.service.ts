import { supabaseAdmin } from '../lib/supabase'
import { executeRun } from './execution-engine'

export const createMonitor = async (
    agent_id: string,
    benchmark_id: string,
    schedule: string,
    alert_email?: string,
    alert_slack_webhook?: string,
    alert_threshold = 0.1
) => {
    const { data, error } = await supabaseAdmin.from('live_monitors').insert({
        agent_id, benchmark_id, schedule, alert_email, alert_slack_webhook, alert_threshold, enabled: true
    }).select().single()
    if (error) throw new Error(error.message)
    return data
}

export const getMonitors = async (agent_id: string) => {
    const { data } = await supabaseAdmin
        .from('live_monitors')
        .select('*, benchmarks(name, domain), agents(name)')
        .eq('agent_id', agent_id)
    return data || []
}

export const toggleMonitor = async (monitor_id: string, enabled: boolean) => {
    await supabaseAdmin.from('live_monitors').update({ enabled }).eq('id', monitor_id)
}

export const runMonitorCheck = async (monitor_id: string) => {
    const { data: monitor } = await supabaseAdmin
        .from('live_monitors').select('*').eq('id', monitor_id).single()
    if (!monitor || !monitor.enabled) return null

    const { data: scenarios } = await supabaseAdmin
        .from('benchmark_scenarios')
        .select('scenario_id')
        .eq('benchmark_id', monitor.benchmark_id)
        .limit(5)

    if (!scenarios || scenarios.length === 0) return null

    const { data: run } = await supabaseAdmin.from('runs').insert({
        agent_id: monitor.agent_id,
        project_id: null,
        status: 'pending',
        total_scenarios: scenarios.length,
        completed_scenarios: 0
    }).select().single()

    if (!run) return null

    await executeRun(run.id, monitor.agent_id, scenarios.map(s => s.scenario_id))

    const { data: completedRun } = await supabaseAdmin
        .from('runs').select('overall_score').eq('id', run.id).single()

    const currentScore = completedRun?.overall_score || 0
    const previousScore = monitor.last_score || currentScore
    const drift = Math.abs(currentScore - previousScore)
    const drift_detected = drift >= monitor.alert_threshold

    await supabaseAdmin.from('monitor_results').insert({
        monitor_id,
        agent_id: monitor.agent_id,
        run_id: run.id,
        score: currentScore,
        previous_score: previousScore,
        drift,
        drift_detected,
        alert_sent: false,
        details: { benchmark_id: monitor.benchmark_id }
    })

    await supabaseAdmin.from('live_monitors').update({
        last_run: new Date().toISOString(),
        last_score: currentScore
    }).eq('id', monitor_id)

    return { score: currentScore, previous_score: previousScore, drift, drift_detected }
}

export const getMonitorResults = async (agent_id: string) => {
    const { data } = await supabaseAdmin
        .from('monitor_results')
        .select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(20)
    return data || []
}