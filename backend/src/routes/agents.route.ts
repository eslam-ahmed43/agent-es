import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getAgents, getAgent, createAgent, updateAgent, deleteAgent } from '../controllers/agents.controller'

const router = Router()
router.use(authMiddleware)
router.get('/', getAgents)
router.get('/:id', getAgent)
router.post('/', createAgent)
router.put('/:id', updateAgent)
router.delete('/:id', deleteAgent)
export default router