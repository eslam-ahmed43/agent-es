import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getScenarios, getScenario, createScenario, deleteScenario } from '../controllers/scenarios.controller'

const router = Router()
router.use(authMiddleware)
router.get('/', getScenarios)
router.get('/:id', getScenario)
router.post('/', createScenario)
router.delete('/:id', deleteScenario)
export default router