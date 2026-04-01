import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../db/client'

declare global {
  namespace Express {
    interface Request {
      portalUser?: { assessmentId: number; email: string }
    }
  }
}

export async function requirePortalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Check Authorization header first (modern approach for cross-domain)
    let token = req.headers.authorization?.replace(/^Bearer\s+/, '')
    // Fallback to cookie for legacy clients
    if (!token) {
      token = req.cookies?.portal_token as string | undefined
    }
    if (!token) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    let payload: { assessmentId: number; email: string }
    try {
      payload = jwt.verify(token, process.env.PORTAL_JWT_SECRET ?? 'dev-secret') as typeof payload
    } catch {
      res.status(401).json({ error: 'Invalid or expired session' })
      return
    }

    // Cross-check email binding against DB
    const result = await db.query<{ email: string }>(
      'SELECT email FROM assessments WHERE id = $1',
      [payload.assessmentId]
    )
    if (!result.rows[0] || result.rows[0].email !== payload.email) {
      res.status(401).json({ error: 'Invalid session' })
      return
    }

    req.portalUser = { assessmentId: payload.assessmentId, email: payload.email }
    next()
  } catch {
    res.status(401).json({ error: 'Not authenticated' })
  }
}
