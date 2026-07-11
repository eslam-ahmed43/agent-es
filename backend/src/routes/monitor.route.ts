import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { create, list, toggle, runCheck, results } from '../controllers/monitor.controller'

const router = Router()
router.use(authMiddleware)
router.post('/', create)
router.post('/toggle', toggle)
router.post('/run', runCheck)
router.get('/results/:agent_id', results)
router.get('/:agent_id', list)
export default router