import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { startRegression, stopRegression, listRegressionRuns, getRegressionById } from '../controllers/regression.controller'

const router = Router()
router.use(authMiddleware)
router.post('/start', startRegression)
router.post('/:id/stop', stopRegression)
router.get('/:agent_id', listRegressionRuns)
router.get('/run/:id', getRegressionById)
export default router