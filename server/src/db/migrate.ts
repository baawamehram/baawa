import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from './client'

async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  const client = await db.connect()
  try {
    await client.query(sql)
    console.log('Migration complete')
  } finally {
    client.release()
    await db.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
