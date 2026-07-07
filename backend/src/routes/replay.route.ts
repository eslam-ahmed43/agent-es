import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { replay, getTrace } from '../controllers/replay.controller'

const router = Router()
router.use(authMiddleware)
router.post('/replay', replay)
router.get('/trace/:run_id', getTrace)
export default router