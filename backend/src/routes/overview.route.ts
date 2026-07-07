import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getAgentOverview } from '../controllers/overview.controller'

const router = Router()
router.use(authMiddleware)
router.get('/:agent_id', getAgentOverview)
export default router