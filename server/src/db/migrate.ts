import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from './client'

async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  const client = await db.connect()
  try {
    // Split by semicolon and filter out empty statements/comments
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (const statement of statements) {
      await client.query(statement)
    }
    console.log(`Migration complete: executed ${statements.length} statements`)
  } finally {
    client.release()
    await db.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
