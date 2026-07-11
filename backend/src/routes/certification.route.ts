import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { issue, get, getPublic } from '../controllers/certification.controller'

const router = Router()
router.use(authMiddleware)
router.post('/issue', issue)
router.get('/public/:token', getPublic)
router.get('/:agent_id', get)
export default router