import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getAnalytics, getSummary, computeAll, computeOne } from '../controllers/cost-analytics.controller'

const router = Router()
router.use(authMiddleware)
router.get('/summary/:agent_id', getSummary)
router.get('/:agent_id', getAnalytics)
router.post('/compute', computeAll)
router.post('/compute-one', computeOne)
export default router