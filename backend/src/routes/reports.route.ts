import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getSummary } from '../controllers/reports.controller'

const router = Router()
router.use(authMiddleware)
router.get('/summary', getSummary)
export default router