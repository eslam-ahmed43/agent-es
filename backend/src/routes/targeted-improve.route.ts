import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { analyze, apply, verify, list } from '../controllers/targeted-improve.controller'

const router = Router()
router.use(authMiddleware)
router.post('/analyze', analyze)
router.post('/apply', apply)
router.post('/verify/:id', verify)
router.get('/:agent_id', list)
export default router