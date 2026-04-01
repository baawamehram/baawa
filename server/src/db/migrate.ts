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

    console.log(`[MIGRATE] Executing ${statements.length} SQL statements from schema.sql`)

    let executed = 0
    for (const statement of statements) {
      executed++
      // Log first 100 chars of statement
      const preview = statement.substring(0, 100).replace(/\n/g, ' ')
      console.log(`[MIGRATE] Statement ${executed}/${statements.length}: ${preview}...`)
      try {
        await client.query(statement)
      } catch (err) {
        console.error(`[MIGRATE] Statement ${executed} FAILED:`)
        console.error(`Statement: ${statement.substring(0, 200)}...`)
        console.error(`Error: ${(err as Error).message}`)
        throw err
      }
    }
    console.log(`[MIGRATE] ✓ Migration complete: executed ${executed} statements`)
  } finally {
    client.release()
    await db.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
