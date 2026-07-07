import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { startRun, getRunStatus, healthCheck, stopRun } from '../controllers/execution.controller'

const router = Router()
router.use(authMiddleware)
router.post('/run', startRun)
router.get('/run/:id', getRunStatus)
router.get('/health/:agent_id', healthCheck)
router.post('/run/:id/stop', stopRun)
export default router