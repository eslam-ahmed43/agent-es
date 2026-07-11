import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { discover, getSession, connectMCP, listConnected } from '../controllers/mcp.controller'

const router = Router()
router.use(authMiddleware)
router.post('/discover', discover)
router.post('/connect', connectMCP)
router.get('/session/:agent_id', getSession)
router.get('/connected', listConnected)
export default router