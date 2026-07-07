import { supabaseAdmin } from '../lib/supabase'
import { executeRun } from './execution-engine'

export const replayRun = async (original_run_id: string, user_id: string): Promise<string> => {
    const { data: originalRun } = await supabaseAdmin
        .from('runs')
        .select('*')
        .eq('id', original_run_id)
        .single()

    if (!originalRun) throw new Error('Original run not found')

    const { data: evaluations } = await supabaseAdmin
        .from('evaluations')
        .select('scenario_id')
        .eq('run_id', original_run_id)

    if (!evaluations || evaluations.length === 0) throw new Error('No scenarios found in original run')

    const scenario_ids = evaluations.map(e => e.scenario_id).filter(Boolean)

    const { data: newRun, error } = await supabaseAdmin
        .from('runs')
        .insert({
            agent_id: originalRun.agent_id,
            project_id: originalRun.project_id,
            status: 'pending',
            total_scenarios: scenario_ids.length,
            completed_scenarios: 0
        })
        .select()
        .single()

    if (error || !newRun) throw new Error('Failed to create replay run')

    executeRun(newRun.id, originalRun.agent_id, scenario_ids).catch(async (err) => {
        await supabaseAdmin.from('runs').update({ status: 'failed' }).eq('id', newRun.id)
        console.error('Replay run failed:', err)
    })

    return newRun.id
}

export const getRunTrace = async (run_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('execution_traces')
        .select('*')
        .eq('run_id', run_id)
        .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
}