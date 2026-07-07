import { Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { AuthRequest } from '../middleware/auth'

export const getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    const { data: runs, error: runsError } = await supabaseAdmin.from('runs').select('*')
    if (runsError) { res.status(500).json({ success: false, error: runsError.message }); return }
    const { data: evaluations, error: evalsError } = await supabaseAdmin.from('evaluations').select('*')
    if (evalsError) { res.status(500).json({ success: false, error: evalsError.message }); return }

    const passed = evaluations?.filter(e => e.passed === true) || []
    const failed = evaluations?.filter(e => e.passed === false) || []
    const scores = evaluations?.map(e => e.overall_score).filter(Boolean) || []
    const avg_score = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const failureReasons = failed.map(e => e.failure_reason).filter(Boolean)
    const reasonCounts: Record<string, number> = {}
    failureReasons.forEach(r => { reasonCounts[r] = (reasonCounts[r] || 0) + 1 })
    const top_failure_reason = Object.keys(reasonCounts).sort((a, b) => reasonCounts[b] - reasonCounts[a])[0] || null

    res.json({
        success: true, data: {
            total_runs: runs?.length || 0, avg_score,
            passed_scenarios: passed.length, failed_scenarios: failed.length, top_failure_reason
        }
    })
}