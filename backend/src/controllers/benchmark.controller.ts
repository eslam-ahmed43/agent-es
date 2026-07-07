import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { getBenchmarks, getBenchmark, runBenchmark, getBenchmarkResults, initializeBenchmarks } from '../services/benchmark.service'

export const listBenchmarks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { agent_type } = req.query
        const data = await getBenchmarks(agent_type as string)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get benchmarks' })
    }
}

export const getBenchmarkById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const data = await getBenchmark(id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(404).json({ success: false, error: err instanceof Error ? err.message : 'Benchmark not found' })
    }
}

export const startBenchmarkRun = async (req: AuthRequest, res: Response): Promise<void> => {
    const { benchmark_id, agent_id, project_id } = req.body

    if (!benchmark_id || !agent_id || !project_id) {
        res.status(400).json({ success: false, error: 'benchmark_id, agent_id, and project_id are required' })
        return
    }

    try {
        const run_id = await runBenchmark(benchmark_id, agent_id, project_id)
        res.status(201).json({ success: true, data: { run_id }, message: 'Benchmark run started' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to start benchmark' })
    }
}

export const getBenchmarkLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const data = await getBenchmarkResults(id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get results' })
    }
}

export const seedBenchmarks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await initializeBenchmarks()
        res.json({ success: true, message: 'Official benchmarks seeded successfully' })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to seed benchmarks' })
    }
}