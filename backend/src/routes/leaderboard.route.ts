import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getBenchmarkLeaderboard, getAll } from '../controllers/leaderboard.controller'

const router = Router()
router.use(authMiddleware)
router.get('/', getAll)
router.get('/:benchmark_id', getBenchmarkLeaderboard)
export default router