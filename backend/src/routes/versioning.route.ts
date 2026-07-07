import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { enrich, list, compare, rollback } from '../controllers/versioning.controller'

const router = Router()
router.use(authMiddleware)
router.post('/enrich/:id', enrich)
router.get('/compare', compare)
router.post('/rollback', rollback)
router.get('/:agent_id', list)
export default router