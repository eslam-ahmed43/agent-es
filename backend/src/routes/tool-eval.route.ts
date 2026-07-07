import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { seed, list, run, results, summary } from '../controllers/tool-eval.controller'

const router = Router()
router.use(authMiddleware)
router.post('/seed', seed)
router.post('/run', run)
router.get('/results/:agent_id', results)
router.get('/summary/:agent_id', summary)
router.get('/:agent_id', list)
export default router