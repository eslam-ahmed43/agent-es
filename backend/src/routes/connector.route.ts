import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { create, test, list, remove } from '../controllers/connector.controller'

const router = Router()
router.use(authMiddleware)
router.post('/', create)
router.post('/test', test)
router.get('/:agent_id', list)
router.delete('/:id', remove)
export default router