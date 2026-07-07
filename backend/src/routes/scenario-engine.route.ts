import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { generateAndSaveScenarios, previewScenarios } from '../controllers/scenario-engine.controller'

const router = Router()

router.use(authMiddleware)

router.post('/generate', generateAndSaveScenarios)
router.post('/preview', previewScenarios)

export default router