import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { seedToolTests, getToolTests, runToolTest, getToolResults, getToolSummary } from '../services/tool-eval.service'

export const seed = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id } = req.body
    if (!agent_id) { res.status(400).json({ success: false, error: 'agent_id is required' }); return }
    try {
        await seedToolTests(agent_id)
        res.json({ success: true, message: 'Tool tests seeded' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to seed' })
    }
}

export const list = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getToolTests(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get tests' })
    }
}

export const run = async (req: AuthRequest, res: Response): Promise<void> => {
    const { tool_test_id, agent_id } = req.body
    if (!tool_test_id || !agent_id) { res.status(400).json({ success: false, error: 'tool_test_id and agent_id required' }); return }
    try {
        const result_id = await runToolTest(tool_test_id, agent_id)
        res.json({ success: true, data: { result_id }, message: 'Tool test completed' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Test failed' })
    }
}

export const results = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getToolResults(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get results' })
    }
}

export const summary = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getToolSummary(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get summary' })
    }
}