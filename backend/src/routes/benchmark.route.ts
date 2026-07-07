import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { listBenchmarks, getBenchmarkById, startBenchmarkRun, getBenchmarkLeaderboard, seedBenchmarks } from '../controllers/benchmark.controller'
import { expand } from '../controllers/benchmark-expansion.controller'

const router = Router()
router.use(authMiddleware)
router.get('/', listBenchmarks)
router.get('/:id', getBenchmarkById)
router.get('/:id/leaderboard', getBenchmarkLeaderboard)
router.post('/run', startBenchmarkRun)
router.post('/seed', seedBenchmarks)
router.post('/expand', expand)
export default router