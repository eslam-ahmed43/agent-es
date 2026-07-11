import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { issueCertification, getCertification, getPublicCertification } from '../services/certification.service'

export const issue = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id } = req.body
    if (!agent_id) { res.status(400).json({ success: false, error: 'agent_id required' }); return }
    try {
        const data = await issueCertification(agent_id)
        res.json({ success: true, data, message: `${(data as any).level?.toUpperCase()} certificate issued!` })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Certification failed' })
    }
}

export const get = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getCertification(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get certification' })
    }
}

export const getPublic = async (req: AuthRequest, res: Response): Promise<void> => {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token
    try {
        const data = await getPublicCertification(token)
        if (!data) { res.status(404).json({ success: false, error: 'Certificate not found' }); return }
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get certificate' })
    }
}