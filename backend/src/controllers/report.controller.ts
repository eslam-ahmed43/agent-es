import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { generateReliabilityReport } from '../services/report.service'

export const downloadReport = async (req: AuthRequest, res: Response): Promise<void> => {
    const agent_id = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id

    try {
        const buffer = await generateReliabilityReport(agent_id)
        const filename = `reliability-report-${agent_id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Length', buffer.length)
        res.send(buffer)
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to generate report' })
    }
}