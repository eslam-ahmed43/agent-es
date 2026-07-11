import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { analyze, get, analyzeFromAgent } from '../controllers/fingerprint.controller'

const router = Router()
router.use(authMiddleware)
router.post('/analyze', analyze)
router.get('/:agent_id', get)
router.post('/analyze/:agent_id', analyzeFromAgent)
export default router