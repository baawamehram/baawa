import { Request, Response, NextFunction } from 'express'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || token !== process.env.FOUNDER_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
