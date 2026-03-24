import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ingestMarkdown } from '../src/services/knowledge'
import { db } from '../src/db/client'

async function main() {
  const filePath = process.argv[2] ?? join(__dirname, '../../knowledge-base/rory-sutherland.md')
  const sourceName = process.argv[3] ?? 'rory-sutherland'

  console.log(`Ingesting: ${filePath} as source "${sourceName}"`)
  const text = readFileSync(filePath, 'utf-8')
  const count = await ingestMarkdown(text, sourceName)
  console.log(`Done. Inserted ${count} chunks.`)
  await db.end()
}

main().catch((err) => {
  console.error('Ingest failed:', err)
  process.exit(1)
})
