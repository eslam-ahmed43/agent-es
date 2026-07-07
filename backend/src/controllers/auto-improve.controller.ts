import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { analyzeAndSuggestImprovement, applySuggestion, getSuggestions, getPromptHistory } from '../services/auto-improve.service'

export const analyze = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, run_id } = req.body
    if (!agent_id || !run_id) {
        res.status(400).json({ success: false, error: 'agent_id and run_id are required' })
        return
    }
    try {
        const suggestion_id = await analyzeAndSuggestImprovement(agent_id, run_id)
        res.json({ success: true, data: { suggestion_id }, message: 'Improvement suggestion generated' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Analysis failed' })
    }
}

export const apply = async (req: AuthRequest, res: Response): Promise<void> => {
    const { suggestion_id } = req.body
    if (!suggestion_id) {
        res.status(400).json({ success: false, error: 'suggestion_id is required' })
        return
    }
    try {
        await applySuggestion(suggestion_id)
        res.json({ success: true, message: 'Suggestion applied successfully' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Apply failed' })
    }
}

export const listSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getSuggestions(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get suggestions' })
    }
}

export const promptHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getPromptHistory(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get history' })
    }
}