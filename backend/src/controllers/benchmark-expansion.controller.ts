import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { expandBenchmark } from '../services/benchmark-expansion.service'

export const expand = async (req: AuthRequest, res: Response): Promise<void> => {
    const { benchmark_id, target_count } = req.body

    if (!benchmark_id) {
        res.status(400).json({ success: false, error: 'benchmark_id is required' })
        return
    }

    try {
        const result = await expandBenchmark(benchmark_id, target_count || 50)
        res.json({
            success: true,
            data: result,
            message: `Added ${result.added} scenarios. Total: ${result.total}`
        })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Expansion failed' })
    }
}