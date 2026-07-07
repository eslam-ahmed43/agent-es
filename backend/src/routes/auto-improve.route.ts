import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { analyze, apply, listSuggestions, promptHistory } from '../controllers/auto-improve.controller'

const router = Router()
router.use(authMiddleware)
router.post('/analyze', analyze)
router.post('/apply', apply)
router.get('/suggestions/:agent_id', listSuggestions)
router.get('/history/:agent_id', promptHistory)
export default router