import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { refresh, getRankings, getTopAgent } from '../controllers/rankings.controller'

const router = Router()
router.use(authMiddleware)
router.post('/refresh', refresh)
router.get('/', getRankings)
router.get('/top', getTopAgent)
export default router