import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getRuns, getRun, createRun } from '../controllers/runs.controller'

const router = Router()
router.use(authMiddleware)
router.get('/', getRuns)
router.get('/:id', getRun)
router.post('/', createRun)
export default router