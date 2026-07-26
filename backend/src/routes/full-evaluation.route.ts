import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { start, getOne, getAll } from '../controllers/full-evaluation.controller'

const router = Router()
router.use(authMiddleware)
router.post('/start', start)
router.get('/agent/:agent_id', getAll)
router.get('/:id', getOne)
export default router