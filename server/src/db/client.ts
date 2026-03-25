import { Pool } from 'pg'

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  max: 10,
  idleTimeoutMillis: 30000,
})

db.on('error', (err) => {
  console.error('Database pool error:', err)
})
