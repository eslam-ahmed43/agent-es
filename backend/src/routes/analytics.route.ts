import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getHistory, getReliability, getAnalytics } from '../controllers/analytics.controller'

const router = Router()
router.use(authMiddleware)
router.get('/history/:agent_id', getHistory)
router.get('/reliability/:agent_id', getReliability)
router.get('/performance/:agent_id', getAnalytics)
export default router