import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'

export interface AuthRequest extends Request {
    user?: {
        id: string
        email: string
    }
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Unauthorized' })
        return
    }

    const token = authHeader.split(' ')[1]
    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !data.user) {
        res.status(401).json({ success: false, error: 'Invalid token' })
        return
    }

    req.user = {
        id: data.user.id,
        email: data.user.email!
    }

    next()
}