import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { seedDataset, validateJudge, getReports, getDataset } from '../controllers/judge-validation.controller'

const router = Router()
router.use(authMiddleware)
router.post('/seed', seedDataset)
router.post('/validate', validateJudge)
router.get('/reports', getReports)
router.get('/dataset', getDataset)
export default router