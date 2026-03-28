import 'dotenv/config'
import { db } from './src/db/client'

async function check() {
  const res = await db.query('SELECT source_name, source_url, content FROM knowledge_chunks WHERE content LIKE \'%太平%\' LIMIT 5')
  console.log('--- CHINESE CONTENT FINDINGS ---')
  res.rows.forEach(r => {
    console.log(`Source: ${r.source_name}`)
    console.log(`URL: ${r.source_url}`)
    console.log(`Content Preview: ${r.content.substring(0, 100)}...`)
    console.log('---')
  })
  process.exit(0)
}

check().catch(console.error)
