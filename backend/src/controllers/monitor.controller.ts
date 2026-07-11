import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { createMonitor, getMonitors, toggleMonitor, runMonitorCheck, getMonitorResults } from '../services/monitor.service'

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, benchmark_id, schedule, alert_email, alert_slack_webhook, alert_threshold } = req.body
    if (!agent_id || !benchmark_id) { res.status(400).json({ success: false, error: 'agent_id and benchmark_id required' }); return }
    try {
        const data = await createMonitor(agent_id, benchmark_id, schedule || 'daily', alert_email, alert_slack_webhook, alert_threshold)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to create monitor' })
    }
}

export const list = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getMonitors(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get monitors' })
    }
}

export const toggle = async (req: AuthRequest, res: Response): Promise<void> => {
    const { monitor_id, enabled } = req.body
    try {
        await toggleMonitor(monitor_id, enabled)
        res.json({ success: true, message: `Monitor ${enabled ? 'enabled' : 'disabled'}` })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to toggle monitor' })
    }
}

export const runCheck = async (req: AuthRequest, res: Response): Promise<void> => {
    const { monitor_id } = req.body
    try {
        const result = await runMonitorCheck(monitor_id)
        res.json({ success: true, data: result })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to run check' })
    }
}

export const results = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getMonitorResults(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get results' })
    }
}