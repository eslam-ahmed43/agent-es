import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { downloadReport } from '../controllers/report.controller'

const router = Router()
router.use(authMiddleware)
router.get('/reliability/:agent_id', downloadReport)
export default router