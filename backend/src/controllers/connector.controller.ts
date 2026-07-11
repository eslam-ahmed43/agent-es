import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { createConnector, testConnector, getConnectors, deleteConnector } from '../services/connector.service'

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
    const { agent_id, connector_type, config } = req.body
    if (!agent_id || !connector_type) { res.status(400).json({ success: false, error: 'agent_id and connector_type required' }); return }
    try {
        const data = await createConnector(agent_id, connector_type, config || {})
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to create connector' })
    }
}

export const test = async (req: AuthRequest, res: Response): Promise<void> => {
    const { connector_id } = req.body
    try {
        const result = await testConnector(connector_id)
        res.json({ success: true, data: result })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Test failed' })
    }
}

export const list = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id
    try {
        const data = await getConnectors(agent_id)
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get connectors' })
    }
}

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
    const connector_id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    try {
        await deleteConnector(connector_id)
        res.json({ success: true, message: 'Connector deleted' })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to delete' })
    }
}